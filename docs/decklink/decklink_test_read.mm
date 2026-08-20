#import <Foundation/Foundation.h>
#import <CoreFoundation/CoreFoundation.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "/Volumes/VGC-01/OBS Sports/Blackmagic DeckLink SDK 16.0/Mac/include/DeckLinkAPI.h"

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        bool jsonOutput = false;
        for (int i = 1; i < argc; i++) {
            if (strcmp(argv[i], "--json") == 0 || strcmp(argv[i], "-j") == 0) {
                jsonOutput = true;
            }
        }

        IDeckLinkIterator* deckLinkIterator = CreateDeckLinkIteratorInstance();
        if (!deckLinkIterator) {
            if (jsonOutput) {
                printf("{\"connected\":false,\"error\":\"Failed to create DeckLink Iterator Instance\"}\n");
            } else {
                printf("ERROR: Failed to create DeckLink Iterator Instance.\n");
            }
            return 1;
        }

        IDeckLink* deckLink = NULL;
        int deviceIndex = 0;

        if (!jsonOutput) {
            printf("==========================================================\n");
            printf(" BLACKMAGIC DECKLINK QUAD 2 - READ-ONLY STATUS TEST TOOL \n");
            printf("==========================================================\n");
        }

        NSMutableDictionary *channelsDict = [NSMutableDictionary dictionary];

        while (deckLinkIterator->Next(&deckLink) == S_OK) {
            deviceIndex++;
            
            CFStringRef modelNameCF = NULL;
            CFStringRef displayNameCF = NULL;
            char modelName[256] = "Desconocido";
            char displayName[256] = "Canal SDI";

            if (deckLink->GetModelName(&modelNameCF) == S_OK && modelNameCF) {
                CFStringGetCString(modelNameCF, modelName, sizeof(modelName), kCFStringEncodingUTF8);
                CFRelease(modelNameCF);
            }
            if (deckLink->GetDisplayName(&displayNameCF) == S_OK && displayNameCF) {
                CFStringGetCString(displayNameCF, displayName, sizeof(displayName), kCFStringEncodingUTF8);
                CFRelease(displayNameCF);
            }

            IDeckLinkStatus* status = NULL;
            HRESULT resStatus = deckLink->QueryInterface(IID_IDeckLinkStatus, (void**)&status);

            bool signalLocked = false;
            char inputFormatStr[128] = "No Signal";
            char pixelFormatStr[128] = "N/A";
            char directionStateStr[32] = "IDLE";

            if (resStatus == S_OK && status) {
                int64_t detectedVideoInputMode = 0;
                int64_t currentVideoInputMode = 0;
                int64_t pixelFormat = 0;
                int64_t busyStatus = 0;

                if (status->GetFlag(bmdDeckLinkStatusVideoInputSignalLocked, &signalLocked) != S_OK) {
                    signalLocked = false;
                }

                if (status->GetInt(bmdDeckLinkStatusBusy, &busyStatus) == S_OK) {
                    if (busyStatus & bmdDevicePlaybackBusy) {
                        snprintf(directionStateStr, sizeof(directionStateStr), "PLAYBACK");
                    } else if (busyStatus & bmdDeviceCaptureBusy) {
                        snprintf(directionStateStr, sizeof(directionStateStr), "CAPTURE");
                    } else {
                        snprintf(directionStateStr, sizeof(directionStateStr), "IDLE");
                    }
                }

                // Primary format source: DetectedVideoInputMode (Hardware Scanner)
                int64_t targetVideoMode = 0;
                if (status->GetInt(bmdDeckLinkStatusDetectedVideoInputMode, &detectedVideoInputMode) == S_OK && detectedVideoInputMode != 0) {
                    targetVideoMode = detectedVideoInputMode;
                } else if (status->GetInt(bmdDeckLinkStatusCurrentVideoInputMode, &currentVideoInputMode) == S_OK && currentVideoInputMode != 0) {
                    targetVideoMode = currentVideoInputMode;
                }

                if (signalLocked && targetVideoMode != 0) {
                    uint32_t mode32 = (uint32_t)targetVideoMode;
                    const char* humanFmt = "Modo Detectado";
                    if (mode32 == bmdModeHD1080p5994) humanFmt = "1080p59.94";
                    else if (mode32 == bmdModeHD1080p6000) humanFmt = "1080p60";
                    else if (mode32 == bmdModeHD1080p50) humanFmt = "1080p50";
                    else if (mode32 == bmdModeHD1080i5994) humanFmt = "1080i59.94";
                    else if (mode32 == bmdModeHD1080i50) humanFmt = "1080i50";
                    else if (mode32 == bmdModeHD720p60) humanFmt = "720p60";
                    else if (mode32 == bmdModeHD720p5994) humanFmt = "720p59.94";
                    else if (mode32 == bmdModeHD720p50) humanFmt = "720p50";

                    snprintf(inputFormatStr, sizeof(inputFormatStr), "%s", humanFmt);
                }

                if (signalLocked && status->GetInt(bmdDeckLinkStatusCurrentVideoInputPixelFormat, &pixelFormat) == S_OK) {
                    uint32_t pix32 = (uint32_t)pixelFormat;
                    const char* pixHuman = "8-bit YUV 4:2:2";
                    if (pix32 == bmdFormat8BitYUV) pixHuman = "8-bit YUV 4:2:2";
                    else if (pix32 == bmdFormat10BitYUV) pixHuman = "10-bit YUV 4:2:2";
                    else if (pix32 == bmdFormat8BitARGB) pixHuman = "8-bit ARGB";
                    else if (pix32 == bmdFormat8BitBGRA) pixHuman = "8-bit BGRA";

                    snprintf(pixelFormatStr, sizeof(pixelFormatStr), "%s", pixHuman);
                }

                status->Release();
            }

            NSString *inputIdStr = [NSString stringWithFormat:@"input-%d", deviceIndex];
            NSString *dNameStr = [NSString stringWithUTF8String:displayName];
            if (!dNameStr) dNameStr = @"DeckLink Quad";

            NSDictionary *chObj = @{
                @"channelId": @(deviceIndex),
                @"channelName": dNameStr,
                @"physicalInputId": inputIdStr,
                @"directionState": [NSString stringWithUTF8String:directionStateStr],
                @"signalLocked": @(signalLocked),
                @"inputFormat": [NSString stringWithUTF8String:inputFormatStr],
                @"pixelFormat": [NSString stringWithUTF8String:pixelFormatStr]
            };
            [channelsDict setObject:chObj forKey:inputIdStr];

            if (!jsonOutput) {
                printf("\n----------------------------------------------------------\n");
                printf("Canal %d: %s [%s]\n", deviceIndex, displayName, modelName);
                printf("ID Insumo Físico: input-%d\n", deviceIndex);
                printf("  • Dirección Activa (directionState)  : %s\n", directionStateStr);
                printf("  • Enganche SDI (signalLocked) : %s\n", signalLocked ? "VERDADERO (SEÑAL PRESENTE / LOCK)" : "FALSO (SIN SEÑAL / NO LOCK)");
                printf("  • Formato de Entrada (inputFormat) : %s\n", inputFormatStr);
                printf("  • Formato de Píxel (pixelFormat)  : %s\n", pixelFormatStr);
            }

            deckLink->Release();
        }

        deckLinkIterator->Release();

        if (jsonOutput) {
            NSISO8601DateFormatter *df = [[NSISO8601DateFormatter alloc] init];
            NSString *nowIso = [df stringFromDate:[NSDate date]];

            NSDictionary *rootObj = @{
                @"connected": @(deviceIndex > 0),
                @"expectedFormat": @"1080p59.94",
                @"channels": channelsDict,
                @"updatedAt": nowIso
            };

            NSData *jsonData = [NSJSONSerialization dataWithJSONObject:rootObj options:0 error:nil];
            if (jsonData) {
                NSString *jsonStr = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
                printf("%s\n", [jsonStr UTF8String]);
            }
        } else {
            if (deviceIndex == 0) {
                printf("\nResultado: No se enumeró ningún dispositivo DeckLink a través del SDK.\n");
            } else {
                printf("\n==========================================================\n");
                printf("Enumeración de %d canales DeckLink SDI completada exitosamente.\n", deviceIndex);
                printf("==========================================================\n");
            }
        }
    }
    return 0;
}
