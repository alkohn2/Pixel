#import <Foundation/Foundation.h>
#import <CoreFoundation/CoreFoundation.h>
#include <stdio.h>
#include <unistd.h>
#include "/Volumes/VGC-01/OBS Sports/Blackmagic DeckLink SDK 16.0/Mac/include/DeckLinkAPI.h"

static void formatFourCC(int64_t val, char str[5]) {
    uint32_t val32 = (uint32_t)val;
    str[0] = (val32 >> 24) & 0xFF;
    str[1] = (val32 >> 16) & 0xFF;
    str[2] = (val32 >> 8) & 0xFF;
    str[3] = val32 & 0xFF;
    str[4] = '\0';
    for (int i = 0; i < 4; i++) {
        if (str[i] < 32 || str[i] > 126) str[i] = '?';
    }
}

static void readChannel3Status(int sampleIndex) {
    IDeckLinkIterator* deckLinkIterator = CreateDeckLinkIteratorInstance();
    if (!deckLinkIterator) {
        printf("Sample #%d: Could not create DeckLinkIteratorInstance\n", sampleIndex);
        return;
    }

    IDeckLink* deckLink = NULL;
    int deviceIndex = 0;
    bool foundCh3 = false;

    NSDateFormatter *df = [[NSDateFormatter alloc] init];
    [df setDateFormat:@"yyyy-MM-dd HH:mm:ss.SSS"];
    NSString *timestampStr = [df stringFromDate:[NSDate date]];

    while (deckLinkIterator->Next(&deckLink) == S_OK) {
        deviceIndex++;
        if (deviceIndex == 3) { // DeckLink Quad (3)
            foundCh3 = true;
            
            CFStringRef displayNameCF = NULL;
            char displayName[256] = "DeckLink Quad (3)";
            if (deckLink->GetDisplayName(&displayNameCF) == S_OK && displayNameCF) {
                CFStringGetCString(displayNameCF, displayName, sizeof(displayName), kCFStringEncodingUTF8);
                CFRelease(displayNameCF);
            }

            IDeckLinkStatus* status = NULL;
            HRESULT resStatus = deckLink->QueryInterface(IID_IDeckLinkStatus, (void**)&status);

            bool signalLocked = false;
            int64_t busyStatus = 0;
            int64_t detectedInputMode = 0;
            int64_t currentInputMode = 0;
            int64_t currentPixelFormat = 0;
            int64_t currentOutputMode = 0;

            if (resStatus == S_OK && status) {
                status->GetFlag(bmdDeckLinkStatusVideoInputSignalLocked, &signalLocked);
                status->GetInt(bmdDeckLinkStatusBusy, &busyStatus);
                status->GetInt(bmdDeckLinkStatusDetectedVideoInputMode, &detectedInputMode);
                status->GetInt(bmdDeckLinkStatusCurrentVideoInputMode, &currentInputMode);
                status->GetInt(bmdDeckLinkStatusCurrentVideoInputPixelFormat, &currentPixelFormat);
                status->GetInt(bmdDeckLinkStatusCurrentVideoOutputMode, &currentOutputMode);
                status->Release();
            }

            char detectedFourCC[5];
            char currentFourCC[5];
            char pixelFourCC[5];
            char outputFourCC[5];
            formatFourCC(detectedInputMode, detectedFourCC);
            formatFourCC(currentInputMode, currentFourCC);
            formatFourCC(currentPixelFormat, pixelFourCC);
            formatFourCC(currentOutputMode, outputFourCC);

            printf("==========================================================\n");
            printf(" MUESTRA #%d - TIMESTAMP LOCAL: %s\n", sampleIndex, [timestampStr UTF8String]);
            printf(" Dispositivo: %s (input-3)\n", displayName);
            printf("  • signalLocked                       : %s\n", signalLocked ? "YES (LOCKED)" : "NO (UNLOCKED)");
            printf("  • bmdDeckLinkStatusBusy             : 0x%llx ", (unsigned long long)busyStatus);
            if (busyStatus & bmdDeviceCaptureBusy) printf("[CAPTURE BUSY] ");
            if (busyStatus & bmdDevicePlaybackBusy) printf("[PLAYBACK BUSY] ");
            if (busyStatus == 0) printf("[IDLE / FREE] ");
            printf("\n");

            printf("  • Detected Input Mode Raw           : 0x%08llx ('%s')\n", (unsigned long long)detectedInputMode, detectedFourCC);
            printf("  • Current Configured Input Mode Raw : 0x%08llx ('%s')\n", (unsigned long long)currentInputMode, currentFourCC);
            printf("  • Current Configured Pixel Format   : 0x%08llx ('%s')\n", (unsigned long long)currentPixelFormat, pixelFourCC);
            printf("  • Current Configured Output Mode Raw: 0x%08llx ('%s')\n", (unsigned long long)currentOutputMode, outputFourCC);
            printf("==========================================================\n");

            deckLink->Release();
            break;
        }
        deckLink->Release();
    }

    if (!foundCh3) {
        printf("Sample #%d: Could not find DeckLink Quad (3) (Device Index 3)\n", sampleIndex);
    }

    deckLinkIterator->Release();
}

int main() {
    @autoreleasepool {
        printf("\n=== AUDITORÍA PUNTUAL PASIVA: DECKLINK QUAD (3) ===\n\n");
        readChannel3Status(1);
        sleep(2);
        readChannel3Status(2);
        sleep(2);
        readChannel3Status(3);
    }
    return 0;
}
