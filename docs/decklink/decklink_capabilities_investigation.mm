#import <Foundation/Foundation.h>
#import <CoreFoundation/CoreFoundation.h>
#include <stdio.h>
#include "/Volumes/VGC-01/OBS Sports/Blackmagic DeckLink SDK 16.0/Mac/include/DeckLinkAPI.h"

int main() {
    @autoreleasepool {
        IDeckLinkIterator* deckLinkIterator = CreateDeckLinkIteratorInstance();
        if (!deckLinkIterator) {
            printf("{\"error\": \"Could not create DeckLinkIteratorInstance\"}\n");
            return 1;
        }

        IDeckLink* deckLink = NULL;
        int deviceIndex = 1;

        printf("=== DECKLINK HARDWARE CAPABILITIES & STATUS INVESTIGATION ===\n");

        while (deckLinkIterator->Next(&deckLink) == S_OK) {
            CFStringRef displayNameCF = NULL;
            CFStringRef modelNameCF = NULL;
            deckLink->GetDisplayName(&displayNameCF);
            deckLink->GetModelName(&modelNameCF);

            char displayName[256] = {0};
            char modelName[256] = {0};
            if (displayNameCF) CFStringGetCString(displayNameCF, displayName, sizeof(displayName), kCFStringEncodingUTF8);
            if (modelNameCF) CFStringGetCString(modelNameCF, modelName, sizeof(modelName), kCFStringEncodingUTF8);

            printf("\n--------------------------------------------------\n");
            printf("Device #%d: %s (Model: %s)\n", deviceIndex, displayName, modelName);

            // Query Profile / Attributes (IDeckLinkProfileAttributes)
            IDeckLinkProfileAttributes* deckLinkAttributes = NULL;
            if (deckLink->QueryInterface(IID_IDeckLinkProfileAttributes, (void**)&deckLinkAttributes) == S_OK) {
                int64_t duplexMode = 0;
                int64_t inputConns = 0;
                int64_t outputConns = 0;
                int64_t subDeviceIdx = 0;
                int64_t numSubDevices = 0;
                int64_t deviceGroupId = 0;
                int64_t persistentId = 0;
                int64_t topologicalId = 0;
                bool supportsInputDetection = false;

                deckLinkAttributes->GetInt(BMDDeckLinkDuplex, &duplexMode);
                deckLinkAttributes->GetInt(BMDDeckLinkVideoInputConnections, &inputConns);
                deckLinkAttributes->GetInt(BMDDeckLinkVideoOutputConnections, &outputConns);
                deckLinkAttributes->GetInt(BMDDeckLinkSubDeviceIndex, &subDeviceIdx);
                deckLinkAttributes->GetInt(BMDDeckLinkNumberOfSubDevices, &numSubDevices);
                deckLinkAttributes->GetInt(BMDDeckLinkDeviceGroupID, &deviceGroupId);
                deckLinkAttributes->GetInt(BMDDeckLinkPersistentID, &persistentId);
                deckLinkAttributes->GetInt(BMDDeckLinkTopologicalID, &topologicalId);
                deckLinkAttributes->GetFlag(BMDDeckLinkSupportsInputFormatDetection, &supportsInputDetection);

                printf("  [Attributes]\n");
                printf("    - SubDevice Index: %lld / %lld\n", (long long)subDeviceIdx, (long long)numSubDevices);
                printf("    - Group ID: %lld | Persistent ID: 0x%llx | Topological ID: 0x%llx\n", (long long)deviceGroupId, (long long)persistentId, (long long)topologicalId);
                
                const char* duplexStr = "Unknown";
                if (duplexMode == bmdDuplexFull) duplexStr = "Full Duplex (Simultaneous In & Out)";
                else if (duplexMode == bmdDuplexHalf) duplexStr = "Half Duplex (In OR Out)";
                else if (duplexMode == bmdDuplexSimplex) duplexStr = "Simplex (Fixed Single Direction)";
                else if (duplexMode == bmdDuplexInactive) duplexStr = "Inactive / Off";
                printf("    - Duplex Mode: %s (raw=0x%llx)\n", duplexStr, (unsigned long long)duplexMode);

                printf("    - Input Connections Mask: 0x%llx (SDI=%s)\n", (unsigned long long)inputConns, (inputConns & bmdVideoConnectionSDI ? "YES" : "NO"));
                printf("    - Output Connections Mask: 0x%llx (SDI=%s)\n", (unsigned long long)outputConns, (outputConns & bmdVideoConnectionSDI ? "YES" : "NO"));
                printf("    - Auto Input Format Detection Supported: %s\n", (supportsInputDetection ? "YES" : "NO"));

                deckLinkAttributes->Release();
            } else {
                printf("  [Attributes] IDeckLinkProfileAttributes NOT supported.\n");
            }

            // Query Status (IDeckLinkStatus)
            IDeckLinkStatus* deckLinkStatus = NULL;
            if (deckLink->QueryInterface(IID_IDeckLinkStatus, (void**)&deckLinkStatus) == S_OK) {
                bool signalLocked = false;
                int64_t currentVideoInputMode = 0;
                int64_t detectedVideoInputMode = 0;
                int64_t currentVideoOutputMode = 0;
                int64_t busyStatus = 0;

                deckLinkStatus->GetFlag(bmdDeckLinkStatusVideoInputSignalLocked, &signalLocked);
                deckLinkStatus->GetInt(bmdDeckLinkStatusCurrentVideoInputMode, &currentVideoInputMode);
                deckLinkStatus->GetInt(bmdDeckLinkStatusDetectedVideoInputMode, &detectedVideoInputMode);
                deckLinkStatus->GetInt(bmdDeckLinkStatusCurrentVideoOutputMode, &currentVideoOutputMode);
                deckLinkStatus->GetInt(bmdDeckLinkStatusBusy, &busyStatus);

                printf("  [Status]\n");
                printf("    - Signal Locked: %s\n", (signalLocked ? "YES (LOCKED)" : "NO (UNLOCKED)"));
                printf("    - Current Input Mode Raw: 0x%llx\n", (unsigned long long)currentVideoInputMode);
                printf("    - Detected Input Mode Raw: 0x%llx\n", (unsigned long long)detectedVideoInputMode);
                printf("    - Current Output Mode Raw: 0x%llx\n", (unsigned long long)currentVideoOutputMode);

                printf("    - Busy Status Flags: 0x%llx", (unsigned long long)busyStatus);
                if (busyStatus & bmdDeviceCaptureBusy) printf(" [CAPTURE BUSY]");
                if (busyStatus & bmdDevicePlaybackBusy) printf(" [PLAYBACK BUSY]");
                if (busyStatus == 0) printf(" [IDLE / FREE]");
                printf("\n");

                deckLinkStatus->Release();
            } else {
                printf("  [Status] IDeckLinkStatus NOT supported.\n");
            }

            // Query Configuration (IDeckLinkConfiguration)
            IDeckLinkConfiguration* deckLinkConfig = NULL;
            if (deckLink->QueryInterface(IID_IDeckLinkConfiguration, (void**)&deckLinkConfig) == S_OK) {
                int64_t videoInputConnection = 0;
                int64_t videoOutputConnection = 0;
                deckLinkConfig->GetInt(bmdDeckLinkConfigVideoInputConnection, &videoInputConnection);
                deckLinkConfig->GetInt(bmdDeckLinkConfigVideoOutputConnection, &videoOutputConnection);

                printf("  [Configuration Read-Only]\n");
                printf("    - Configured Input Connection: 0x%llx\n", (unsigned long long)videoInputConnection);
                printf("    - Configured Output Connection: 0x%llx\n", (unsigned long long)videoOutputConnection);

                deckLinkConfig->Release();
            }

            if (displayNameCF) CFRelease(displayNameCF);
            if (modelNameCF) CFRelease(modelNameCF);
            deckLink->Release();
            deviceIndex++;
        }

        deckLinkIterator->Release();
    }
    return 0;
}
