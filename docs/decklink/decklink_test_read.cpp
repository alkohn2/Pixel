#include <iostream>
#include <iomanip>
#include <vector>
#include <string>
#include <map>
#include <CoreFoundation/CoreFoundation.h>
#include "DeckLinkAPI.h"

// Helper to convert CFStringRef to std::string
std::string CFStringToStdString(CFStringRef cfStr) {
    if (!cfStr) return "";
    char buffer[256];
    if (CFStringGetCString(cfStr, buffer, sizeof(buffer), kCFStringEncodingUTF8)) {
        return std::string(buffer);
    }
    return "";
}

// Convert 4-char OSType to string (e.g. 'hp59' -> "hp59")
std::string OSTypeToString(BMDDisplayMode mode) {
    char code[5] = {0};
    uint32_t m = (uint32_t)mode;
    code[0] = (m >> 24) & 0xFF;
    code[1] = (m >> 16) & 0xFF;
    code[2] = (m >> 8) & 0xFF;
    code[3] = m & 0xFF;
    return std::string(code);
}

int main() {
    std::cout << "==========================================================" << std::endl;
    std::cout << " BLACKMAGIC DECKLINK QUAD 2 - READ-ONLY STATUS TEST TOOL " << std::endl;
    std::cout << "==========================================================" << std::endl;

    IDeckLinkIterator* deckLinkIterator = CreateDeckLinkIteratorInstance();
    if (!deckLinkIterator) {
        std::cerr << "ERROR: Failed to create DeckLink Iterator Instance." << std::endl;
        std::cerr << "Causa: El driver Desktop Video framework no respondió al iterador del SDK." << std::endl;
        return 1;
    }

    IDeckLink* deckLink = NULL;
    int deviceIndex = 0;

    while (deckLinkIterator->Next(&deckLink) == S_OK) {
        deviceIndex++;
        
        CFStringRef modelNameCF = NULL;
        CFStringRef displayNameCF = NULL;
        std::string modelName = "Desconocido";
        std::string displayName = "Canal SDI";

        if (deckLink->GetModelName(&modelNameCF) == S_OK && modelNameCF) {
            modelName = CFStringToStdString(modelNameCF);
            CFRelease(modelNameCF);
        }
        if (deckLink->GetDisplayName(&displayNameCF) == S_OK && displayNameCF) {
            displayName = CFStringToStdString(displayNameCF);
            CFRelease(displayNameCF);
        }

        std::cout << "\n----------------------------------------------------------" << std::endl;
        std::cout << "Canal " << deviceIndex << ": " << displayName << " [" << modelName << "]" << std::endl;
        std::cout << "ID Insumo Físico: input-" << deviceIndex << std::endl;

        // Query IDeckLinkStatus interface (Pasivo / Read-Only)
        IDeckLinkStatus* status = NULL;
        HRESULT resStatus = deckLink->QueryInterface(IID_IDeckLinkStatus, (void**)&status);

        // Query IDeckLinkInput interface to build a human-readable display mode map
        IDeckLinkInput* deckLinkInput = NULL;
        deckLink->QueryInterface(IID_IDeckLinkInput, (void**)&deckLinkInput);

        std::map<BMDDisplayMode, std::string> modeMap;
        if (deckLinkInput) {
            IDeckLinkDisplayModeIterator* modeIterator = NULL;
            if (deckLinkInput->GetDisplayModeIterator(&modeIterator) == S_OK && modeIterator) {
                IDeckLinkDisplayMode* displayMode = NULL;
                while (modeIterator->Next(&displayMode) == S_OK) {
                    CFStringRef modeNameCF = NULL;
                    if (displayMode->GetName(&modeNameCF) == S_OK && modeNameCF) {
                        modeMap[displayMode->GetDisplayMode()] = CFStringToStdString(modeNameCF);
                        CFRelease(modeNameCF);
                    }
                    displayMode->Release();
                }
                modeIterator->Release();
            }
        }

        if (resStatus == S_OK && status) {
            bool signalLocked = false;
            int64_t videoInputMode = 0;
            int64_t pixelFormat = 0;

            // 1. Signal Lock Check
            if (status->GetFlag(bmdDeckLinkStatusVideoInputSignalLocked, &signalLocked) != S_OK) {
                signalLocked = false;
            }

            std::cout << "  • Enganche SDI (signalLocked) : " 
                      << (signalLocked ? "VERDADERO (SEÑAL PRESENTEE / LOCK)" : "FALSO (SIN SEÑAL / NO LOCK)") 
                      << std::endl;

            // 2. Input Format Check
            if (signalLocked && status->GetInt(bmdDeckLinkStatusCurrentVideoInputMode, &videoInputMode) == S_OK) {
                BMDDisplayMode modeKey = (BMDDisplayMode)videoInputMode;
                std::string modeStr = OSTypeToString(modeKey);
                std::string humanName = modeMap.count(modeKey) ? modeMap[modeKey] : "Modo Detectado";

                std::cout << "  • Formato de Entrada (inputFormat) : " << humanName << " [" << modeStr << "]" << std::endl;
            } else {
                std::cout << "  • Formato de Entrada (inputFormat) : Sin Señal" << std::endl;
            }

            // 3. Pixel Format Check
            if (signalLocked && status->GetInt(bmdDeckLinkStatusCurrentVideoInputPixelFormat, &pixelFormat) == S_OK) {
                std::string pixStr = OSTypeToString((BMDDisplayMode)pixelFormat);
                std::cout << "  • Formato de Píxel (pixelFormat)  : " << pixStr << " (0x" << std::hex << pixelFormat << std::dec << ")" << std::endl;
            } else {
                std::cout << "  • Formato de Píxel (pixelFormat)  : N/A" << std::endl;
            }

            status->Release();
        } else {
            std::cout << "  • Estado: Error al consultar IDeckLinkStatus (0x" << std::hex << resStatus << std::dec << ")" << std::endl;
        }

        if (deckLinkInput) {
            deckLinkInput->Release();
        }

        deckLink->Release();
    }

    deckLinkIterator->Release();

    if (deviceIndex == 0) {
        std::cout << "\nResultado: No se enumeró ningún dispositivo DeckLink a través del SDK." << std::endl;
    } else {
        std::cout << "\n==========================================================" << std::endl;
        std::cout << "Enumeración de " << deviceIndex << " canales DeckLink SDI completada exitosamente." << std::endl;
        std::cout << "==========================================================" << std::endl;
    }

    return 0;
}
