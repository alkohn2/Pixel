#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#import <OpenGL/OpenGL.h>
#import <OpenGL/gl.h>
#import "PixelGraphics-Bridging-Header.h"
#import "Processing.NDI.Lib.h"

@interface PixelRendererApp : NSObject <NSApplicationDelegate, WKNavigationDelegate>
@property (strong, nonatomic) NSWindow *window;
@property (strong, nonatomic) WKWebView *webView;
@property (strong, nonatomic) NSDictionary *config;
@property (strong, nonatomic) NSTimer *renderTimer;
@property (assign, nonatomic) BOOL isCapturing;

// Transport Selection
@property (strong, nonatomic) NSString *transportType; // "ndi" (default) or "syphon"

// Syphon Transport
@property (strong, nonatomic) SyphonServer *syphonServer;
@property (assign, nonatomic) CGLContextObj glContext;
@property (assign, nonatomic) GLuint textureId;

// NDI Transport
@property (assign, nonatomic) NDIlib_send_instance_t ndiSender;
@property (strong, nonatomic) NSMutableData *pixelBuffer;
@end

@implementation PixelRendererApp

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];

    [self loadConfig];
    [self setupTransparentWebView];
    [self loadOverlayURL];

    self.transportType = [self.config[@"transport"] lowercaseString] ?: @"ndi";

    if ([self.transportType isEqualToString:@"syphon"]) {
        [self setupSyphon];
    } else {
        [self setupNDI];
    }

    [self startRenderLoop];

    NSLog(@"==================================================");
    NSLog(@"[PIXEL Graphics Renderer] Online & Broadcasting");
    NSLog(@"[PIXEL Graphics Renderer] Official Transport: %@", [self.transportType uppercaseString]);
    NSLog(@"[PIXEL Graphics Renderer] Source Name: %@", self.config[@"sourceName"]);
    NSLog(@"[PIXEL Graphics Renderer] Window Mode: %@", [self.config[@"showRendererWindow"] boolValue] ? @"VISIBLE (Debug)" : @"OFFSCREEN (Production)");
    NSLog(@"[PIXEL Graphics Renderer] Resolution: %@x%@ @ %@fps (Alpha: YES / BGRA)",
          self.config[@"width"], self.config[@"height"], self.config[@"fps"]);
    NSLog(@"[PIXEL Graphics Renderer] URL: http://%@:%@%@", 
          self.config[@"host"], self.config[@"port"], self.config[@"overlayPath"]);
    NSLog(@"==================================================");
}

- (void)loadConfig {
    NSString *currentDir = [[NSFileManager defaultManager] currentDirectoryPath];
    NSString *configPath = [currentDir stringByAppendingPathComponent:@"config.json"];
    NSData *data = [NSData dataWithContentsOfFile:configPath];
    if (data) {
        NSError *err = nil;
        self.config = [NSJSONSerialization JSONObjectWithData:data options:0 error:&err];
    }
    if (!self.config) {
        self.config = @{
            @"transport": @"ndi",
            @"sourceName": @"PIXEL Graphics",
            @"showRendererWindow": @NO,
            @"host": @"127.0.0.1",
            @"port": @8081,
            @"overlayPath": @"/graphics/volleyball/volleyball-master-overlay.html",
            @"width": @1920,
            @"height": @1080,
            @"fps": @59.94,
            @"alpha": @YES
        };
    }
}

- (void)setupTransparentWebView {
    BOOL showWindow = [self.config[@"showRendererWindow"] boolValue];
    CGFloat width = [self.config[@"width"] floatValue] ?: 1920.0;
    CGFloat height = [self.config[@"height"] floatValue] ?: 1080.0;
    
    NSRect frame = NSMakeRect(0, 0, width, height);

    self.window = [[NSWindow alloc] initWithContentRect:frame
                                              styleMask:NSWindowStyleMaskBorderless
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    self.window.opaque = NO;
    self.window.hasShadow = NO;
    self.window.backgroundColor = [NSColor clearColor];
    self.window.ignoresMouseEvents = YES;
    self.window.excludedFromWindowsMenu = YES;
    self.window.hidesOnDeactivate = NO;
    self.window.sharingType = NSWindowSharingNone;
    [self.window setCollectionBehavior:NSWindowCollectionBehaviorCanJoinAllSpaces | NSWindowCollectionBehaviorStationary | NSWindowCollectionBehaviorIgnoresCycle];

    if (showWindow) {
        self.window.alphaValue = 1.0;
        self.window.level = NSFloatingWindowLevel;
        self.window.ignoresMouseEvents = NO;
    } else {
        // Safe invisible desktop rendering:
        // alphaValue 0.0 makes the window 100% invisible on the Mac desktop while WebKit
        // continues rendering the full 1920x1080 buffer offscreen for takeSnapshotWithConfiguration:
        self.window.alphaValue = 0.0;
        self.window.level = kCGDesktopWindowLevel;
        self.window.ignoresMouseEvents = YES;
    }

    WKWebViewConfiguration *webConfig = [[WKWebViewConfiguration alloc] init];
    [webConfig.preferences setValue:@YES forKey:@"allowFileAccessFromFileURLs"];
    [webConfig.preferences setValue:@NO forKey:@"pageVisibilityBasedProcessSuppressionEnabled"];

    self.webView = [[WKWebView alloc] initWithFrame:frame configuration:webConfig];
    [self.webView setValue:@NO forKey:@"drawsBackground"];
    self.webView.navigationDelegate = self;

    self.window.contentView = self.webView;

    if (showWindow) {
        [self.window orderFrontRegardless];
    } else {
        [self.window orderWindow:NSWindowBelow relativeTo:0];
    }

    self.pixelBuffer = [NSMutableData dataWithLength:(size_t)(width * height * 4)];
}

- (void)loadOverlayURL {
    NSString *urlString = [NSString stringWithFormat:@"http://%@:%@%@", 
                           self.config[@"host"], self.config[@"port"], self.config[@"overlayPath"]];
    NSURL *url = [NSURL URLWithString:urlString];
    NSURLRequest *req = [NSURLRequest requestWithURL:url 
                                         cachePolicy:NSURLRequestReloadIgnoringLocalAndRemoteCacheData 
                                     timeoutInterval:10.0];
    [self.webView loadRequest:req];
}

// ── NDI SETUP ──
- (void)setupNDI {
    if (!NDIlib_initialize()) {
        NSLog(@"[PIXEL Graphics Renderer] ERROR: NDIlib_initialize failed!");
        return;
    }

    NSString *sourceName = self.config[@"sourceName"] ?: @"PIXEL Graphics";
    NDIlib_send_create_t createSettings;
    memset(&createSettings, 0, sizeof(createSettings));
    createSettings.p_ndi_name = [sourceName UTF8String];
    createSettings.p_groups = NULL;
    createSettings.clock_video = true;
    createSettings.clock_audio = false;

    for (int retry = 0; retry < 5 && !self.ndiSender; retry++) {
        if (retry > 0) [NSThread sleepForTimeInterval:0.5];
        self.ndiSender = NDIlib_send_create(&createSettings);
    }

    if (self.ndiSender) {
        NSLog(@"[PIXEL Graphics Renderer] NDI Sender created successfully: '%@'", sourceName);
    } else {
        NSLog(@"[PIXEL Graphics Renderer] ERROR: Failed to create NDI sender!");
    }
}

// ── SYPHON SETUP ──
- (void)setupSyphon {
    CGLPixelFormatAttribute attribs[] = {
        kCGLPFAAccelerated,
        kCGLPFANoRecovery,
        kCGLPFAColorSize, (CGLPixelFormatAttribute)32,
        kCGLPFAAlphaSize, (CGLPixelFormatAttribute)8,
        (CGLPixelFormatAttribute)0
    };
    CGLPixelFormatObj pixFormat;
    GLint numPixelFormats;
    CGLChoosePixelFormat(attribs, &pixFormat, &numPixelFormats);
    CGLContextObj ctx;
    CGLCreateContext(pixFormat, NULL, &ctx);
    CGLDestroyPixelFormat(pixFormat);
    self.glContext = ctx;

    CGLSetCurrentContext(self.glContext);
    glGenTextures(1, &_textureId);
    glBindTexture(GL_TEXTURE_2D, _textureId);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);

    NSString *name = self.config[@"sourceName"] ?: @"PIXEL Graphics";
    self.syphonServer = [[SyphonServer alloc] initWithName:name context:self.glContext options:nil];
}

// ── RENDER LOOP ──
- (void)startRenderLoop {
    double fps = [self.config[@"fps"] doubleValue] ?: 59.94;
    NSTimeInterval interval = 1.0 / fps;
    
    self.renderTimer = [NSTimer scheduledTimerWithTimeInterval:interval
                                                       target:self
                                                     selector:@selector(captureAndPublishFrame)
                                                     userInfo:nil
                                                      repeats:YES];
    [[NSRunLoop currentRunLoop] addTimer:self.renderTimer forMode:NSEventTrackingRunLoopMode];
    [[NSRunLoop currentRunLoop] addTimer:self.renderTimer forMode:NSDefaultRunLoopMode];
}

- (void)captureAndPublishFrame {
    if (self.isCapturing) return;

    CGFloat width = [self.config[@"width"] floatValue] ?: 1920.0;
    CGFloat height = [self.config[@"height"] floatValue] ?: 1080.0;

    self.isCapturing = YES;
    WKSnapshotConfiguration *snapConfig = [[WKSnapshotConfiguration alloc] init];
    snapConfig.rect = NSMakeRect(0, 0, width, height);

    [self.webView takeSnapshotWithConfiguration:snapConfig completionHandler:^(NSImage * _Nullable snapshotImage, NSError * _Nullable error) {
        if (snapshotImage && !error) {
            if ([self.transportType isEqualToString:@"syphon"]) {
                [self publishSyphonFrame:snapshotImage width:width height:height];
            } else {
                [self publishNDIFrame:snapshotImage width:width height:height];
            }
        }
        self.isCapturing = NO;
    }];
}

// ── DIAGNOSTIC TELEMETRY ──
static uint64_t gFrameIndex = 0;
static uint64_t gLastChecksum = 0;

static uint64_t computeBufferChecksum(const uint8_t *bytes, size_t length) {
    uint64_t hash = 14695981039346656037ULL;
    // Fast sample hash (every 64 bytes)
    for (size_t i = 0; i < length; i += 64) {
        hash ^= bytes[i];
        hash *= 1099511628211ULL;
    }
    return hash;
}

static void saveDiagnosticPNG(CGImageRef cgImage, NSString *path) {
    if (!cgImage) return;
    CFURLRef url = (__bridge CFURLRef)[NSURL fileURLWithPath:path];
    CGImageDestinationRef dest = CGImageDestinationCreateWithURL(url, (CFStringRef)@"public.png", 1, NULL);
    if (dest) {
        CGImageDestinationAddImage(dest, cgImage, NULL);
        CGImageDestinationFinalize(dest);
        CFRelease(dest);
        NSLog(@"[DIAGNOSTIC] Saved snapshot to %@", path);
    }
}

// ── NDI PUBLISH (BGRA 32-bit Straight/Premultiplied with Full Frame Clear) ──
- (void)publishNDIFrame:(NSImage *)image width:(CGFloat)width height:(CGFloat)height {
    if (!self.ndiSender) return;

    CGImageRef cgImage = [image CGImageForProposedRect:NULL context:NULL hints:nil];
    if (!cgImage) return;

    size_t w = CGImageGetWidth(cgImage);
    size_t h = CGImageGetHeight(cgImage);

    if (self.pixelBuffer.length != w * h * 4) {
        self.pixelBuffer = [NSMutableData dataWithLength:w * h * 4];
    }

    // 1. Explicit clean clear of buffer memory to prevent any stale pixels / ghosts
    memset(self.pixelBuffer.mutableBytes, 0, w * h * 4);

    // 2. Render into BGRA Little Endian bitmap context
    CGColorSpaceRef colorSpace = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
    CGContextRef ctx = CGBitmapContextCreate(self.pixelBuffer.mutableBytes,
                                             w, h, 8, w * 4,
                                             colorSpace,
                                             kCGImageAlphaPremultipliedFirst | kCGBitmapByteOrder32Little);
    CGContextClearRect(ctx, CGRectMake(0, 0, w, h));
    CGContextDrawImage(ctx, CGRectMake(0, 0, w, h), cgImage);
    CGContextRelease(ctx);
    CGColorSpaceRelease(colorSpace);

    gFrameIndex++;
    uint64_t currentChecksum = computeBufferChecksum((const uint8_t *)self.pixelBuffer.bytes, self.pixelBuffer.length);

    if (gFrameIndex % 60 == 0 || currentChecksum != gLastChecksum) {
        NSLog(@"[RENDER_LOOP] Frame #%llu | Checksum: 0x%llX | Changed: %@",
              gFrameIndex, currentChecksum, (currentChecksum != gLastChecksum) ? @"YES (State/DOM Changed)" : @"NO (Static)");
        gLastChecksum = currentChecksum;
    }

    // 3. Publish NDI Frame synchronously to avoid buffer reuse collision
    NDIlib_video_frame_v2_t videoFrame;
    videoFrame.xres = (int)w;
    videoFrame.yres = (int)h;
    videoFrame.FourCC = NDIlib_FourCC_video_type_BGRA;
    videoFrame.frame_rate_N = 60000;
    videoFrame.frame_rate_D = 1001;
    videoFrame.picture_aspect_ratio = 16.0f / 9.0f;
    videoFrame.frame_format_type = NDIlib_frame_format_type_progressive;
    videoFrame.timecode = 0;
    videoFrame.p_data = (uint8_t *)self.pixelBuffer.bytes;
    videoFrame.line_stride_in_bytes = (int)(w * 4);
    videoFrame.p_metadata = NULL;
    videoFrame.timestamp = 0;

    NDIlib_send_send_video_v2(self.ndiSender, &videoFrame);
}

// ── SYPHON PUBLISH ──
- (void)publishSyphonFrame:(NSImage *)image width:(CGFloat)width height:(CGFloat)height {
    if (!self.syphonServer) return;

    CGImageRef cgImage = [image CGImageForProposedRect:NULL context:NULL hints:nil];
    if (!cgImage) return;

    size_t w = CGImageGetWidth(cgImage);
    size_t h = CGImageGetHeight(cgImage);

    if (self.pixelBuffer.length != w * h * 4) {
        self.pixelBuffer = [NSMutableData dataWithLength:w * h * 4];
    }

    memset(self.pixelBuffer.mutableBytes, 0, w * h * 4);

    CGColorSpaceRef colorSpace = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
    CGContextRef ctx = CGBitmapContextCreate(self.pixelBuffer.mutableBytes,
                                             w, h, 8, w * 4,
                                             colorSpace,
                                             kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big);
    CGContextClearRect(ctx, CGRectMake(0, 0, w, h));
    CGContextDrawImage(ctx, CGRectMake(0, 0, w, h), cgImage);
    CGContextRelease(ctx);
    CGColorSpaceRelease(colorSpace);

    CGLSetCurrentContext(self.glContext);
    glBindTexture(GL_TEXTURE_2D, self.textureId);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, (GLsizei)w, (GLsizei)h, 0, GL_RGBA, GL_UNSIGNED_BYTE, self.pixelBuffer.bytes);

    NSRect region = NSMakeRect(0, 0, w, h);
    NSSize size = NSMakeSize(w, h);
    [self.syphonServer publishFrameTexture:self.textureId
                             textureTarget:GL_TEXTURE_2D
                               imageRegion:region
                         textureDimensions:size
                                   flipped:YES];
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    NSLog(@"[PIXEL Graphics Renderer] Web overlay loaded and running.");
}

- (void)applicationWillTerminate:(NSNotification *)notification {
    if (self.ndiSender) {
        NDIlib_send_destroy(self.ndiSender);
        NDIlib_destroy();
    }
    if (self.syphonServer) {
        [self.syphonServer stop];
    }
    if (self.glContext) {
        CGLDestroyContext(self.glContext);
    }
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        [app setActivationPolicy:NSApplicationActivationPolicyAccessory];
        PixelRendererApp *delegate = [[PixelRendererApp alloc] init];
        app.delegate = delegate;
        [app run];
    }
    return 0;
}
