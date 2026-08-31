#import <Cocoa/Cocoa.h>
#import <Carbon/Carbon.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

// F1 Virtual Keycode in macOS is 122 (0x7A / kVK_F1)
#define KEYCODE_F1 122

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        pid_t targetPid = 0;
        int keyCode = KEYCODE_F1;
        BOOL directToPid = YES;
        BOOL jsonOutput = NO;

        for (int i = 1; i < argc; i++) {
            if (strcmp(argv[i], "--pid") == 0 && i + 1 < argc) {
                targetPid = (pid_t)atoi(argv[++i]);
            } else if (strcmp(argv[i], "--global") == 0) {
                directToPid = NO;
            } else if (strcmp(argv[i], "--json") == 0) {
                jsonOutput = YES;
            }
        }

        // Dynamically resolve Production Truck PID if not provided
        NSRunningApplication *truckApp = nil;
        NSArray<NSRunningApplication *> *apps = [[NSWorkspace sharedWorkspace] runningApplications];
        for (NSRunningApplication *app in apps) {
            NSString *bundleId = app.bundleIdentifier;
            NSString *name = app.localizedName;
            if ([bundleId isEqualToString:@"com.hudl.Production-Truck"] || 
                [name localizedCaseInsensitiveContainsString:@"Production Truck"]) {
                truckApp = app;
                if (targetPid == 0) {
                    targetPid = app.processIdentifier;
                }
                break;
            }
        }

        if (targetPid == 0 && truckApp) {
            targetPid = truckApp.processIdentifier;
        }

        BOOL isFrontmost = NO;
        NSRunningApplication *frontmostApp = [[NSWorkspace sharedWorkspace] frontmostApplication];
        if (targetPid > 0 && frontmostApp && frontmostApp.processIdentifier == targetPid) {
            isFrontmost = YES;
        }

        if (targetPid == 0) {
            if (jsonOutput) {
                printf("{\"success\":false,\"error\":\"TRUCK_PROCESS_NOT_FOUND\"}\n");
            } else {
                fprintf(stderr, "Error: Production Truck process not found\n");
            }
            return 2;
        }

        CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateHIDSystemState);
        if (!source) {
            if (jsonOutput) printf("{\"success\":false,\"error\":\"CGEventSourceCreate failed\"}\n");
            return 1;
        }

        CGEventRef keyDown = CGEventCreateKeyboardEvent(source, (CGKeyCode)keyCode, true);
        CGEventRef keyUp = CGEventCreateKeyboardEvent(source, (CGKeyCode)keyCode, false);

        if (!keyDown || !keyUp) {
            if (jsonOutput) printf("{\"success\":false,\"error\":\"CGEventCreateKeyboardEvent failed\"}\n");
            CFRelease(source);
            return 1;
        }

        // Pure F1 (no Fn or other modifiers)
        CGEventSetFlags(keyDown, (CGEventFlags)0);
        CGEventSetFlags(keyUp, (CGEventFlags)0);

        if (directToPid) {
            CGEventPostToPid(targetPid, keyDown);
            usleep(30000); // 30ms keydown duration
            CGEventPostToPid(targetPid, keyUp);
        } else {
            CGEventPost(kCGHIDEventTap, keyDown);
            usleep(30000);
            CGEventPost(kCGHIDEventTap, keyUp);
        }

        CFRelease(keyDown);
        CFRelease(keyUp);
        CFRelease(source);

        if (jsonOutput) {
            printf("{\"success\":true,\"action\":\"TRUCK_CUT_CAMERA_1\",\"key\":\"F1\",\"keyCode\":%d,\"targetPid\":%d,\"isFrontmost\":%s,\"mode\":\"%s\"}\n",
                   keyCode, (int)targetPid, isFrontmost ? "true" : "false", directToPid ? "directToPid" : "globalHID");
        } else {
            printf("✅ Sent F1 to Production Truck (PID: %d, Frontmost: %s, Mode: %s)\n",
                   (int)targetPid, isFrontmost ? "YES" : "NO", directToPid ? "directToPid" : "globalHID");
        }

        return 0;
    }
}
