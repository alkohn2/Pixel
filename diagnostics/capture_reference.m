#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>

@interface CaptureDelegate : NSObject <WKNavigationDelegate>
@property (strong) WKWebView *webView;
@property (strong) NSWindow *window;
@property (strong) NSString *outputPath;
@end

@implementation CaptureDelegate

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
        WKSnapshotConfiguration *config = [[WKSnapshotConfiguration alloc] init];
        config.rect = NSMakeRect(0, 0, 1920, 1080);
        [self.webView takeSnapshotWithConfiguration:config completionHandler:^(NSImage * _Nullable snapshotImage, NSError * _Nullable error) {
            if (snapshotImage) {
                CGImageRef cgImage = [snapshotImage CGImageForProposedRect:NULL context:NULL hints:nil];
                NSString *path = self.outputPath ?: @"/Volumes/VGC-01/OBS Sports/PIXEL/diagnostics/browser-reference.png";
                CFURLRef url = (__bridge CFURLRef)[NSURL fileURLWithPath:path];
                CGImageDestinationRef dest = CGImageDestinationCreateWithURL(url, (CFStringRef)UTTypePNG.identifier, 1, NULL);
                if (dest) {
                    CGImageDestinationAddImage(dest, cgImage, NULL);
                    CGImageDestinationFinalize(dest);
                    CFRelease(dest);
                    NSLog(@"Successfully saved %@", path);
                }
            } else {
                NSLog(@"Error taking snapshot: %@", error);
            }
            [NSApp terminate:nil];
        }];
    });
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        [app setActivationPolicy:NSApplicationActivationPolicyAccessory];

        CaptureDelegate *delegate = [[CaptureDelegate alloc] init];
        if (argc > 1) {
            delegate.outputPath = [NSString stringWithUTF8String:argv[1]];
        }
        NSRect frame = NSMakeRect(0, 0, 1920, 1080);
        delegate.window = [[NSWindow alloc] initWithContentRect:frame styleMask:NSWindowStyleMaskBorderless backing:NSBackingStoreBuffered defer:NO];
        delegate.window.opaque = NO;
        delegate.window.backgroundColor = [NSColor clearColor];

        WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
        [config.preferences setValue:@YES forKey:@"allowFileAccessFromFileURLs"];
        delegate.webView = [[WKWebView alloc] initWithFrame:frame configuration:config];
        [delegate.webView setValue:@NO forKey:@"drawsBackground"];
        delegate.webView.navigationDelegate = delegate;

        delegate.window.contentView = delegate.webView;
        [delegate.window orderFrontRegardless];

        NSURL *url = [NSURL URLWithString:@"http://127.0.0.1:8081/graphics/volleyball/volleyball-master-overlay.html"];
        [delegate.webView loadRequest:[NSURLRequest requestWithURL:url]];

        [app run];
    }
    return 0;
}
