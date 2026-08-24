#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>
#import <OpenGL/OpenGL.h>
#import <OpenGL/gl.h>
#import "PixelGraphics-Bridging-Header.h"

@interface PixelRendererApp : NSObject <NSApplicationDelegate, WKNavigationDelegate>
@property (strong, nonatomic) NSWindow *window;
@property (strong, nonatomic) WKWebView *webView;
@property (strong, nonatomic) SyphonServer *syphonServer;
@property (assign, nonatomic) CGLContextObj glContext;
@property (strong, nonatomic) NSTimer *renderTimer;
@property (strong, nonatomic) NSDictionary *config;
@property (assign, nonatomic) GLuint textureId;
@property (assign, nonatomic) BOOL isCapturing;
@end

@implementation PixelRendererApp

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    [self loadConfig];
    [self setupOpenGLContext];
    [self setupSyphonServer];
    [self setupTransparentWebView];
    [self loadOverlayURL];
    [self startRenderLoop];

    NSLog(@"[PIXEL Syphon Renderer] Started successfully.");
    NSLog(@"[PIXEL Syphon Renderer] Syphon Server: %@", self.syphonServer.name);
    NSLog(@"[PIXEL Syphon Renderer] URL: http://%@:%@%@", 
          self.config[@"host"], self.config[@"port"], self.config[@"overlayPath"]);
    NSLog(@"[PIXEL Syphon Renderer] Output: %@x%@ @ %@fps (Alpha: YES)", 
          self.config[@"width"], self.config[@"height"], self.config[@"fps"]);
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
            @"sourceName": @"PIXEL Graphics",
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

- (void)setupOpenGLContext {
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
}

- (void)setupSyphonServer {
    NSString *name = self.config[@"sourceName"] ?: @"PIXEL Graphics";
    self.syphonServer = [[SyphonServer alloc] initWithName:name context:self.glContext options:nil];
    if (self.syphonServer) {
        NSLog(@"[PIXEL Syphon Renderer] Successfully registered Syphon Server '%@'", name);
    } else {
        NSLog(@"[PIXEL Syphon Renderer] ERROR: Failed to create Syphon Server!");
    }
}

- (void)setupTransparentWebView {
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
    self.window.level = NSFloatingWindowLevel;
    self.window.ignoresMouseEvents = YES;

    WKWebViewConfiguration *webConfig = [[WKWebViewConfiguration alloc] init];
    [webConfig.preferences setValue:@YES forKey:@"allowFileAccessFromFileURLs"];

    self.webView = [[WKWebView alloc] initWithFrame:frame configuration:webConfig];
    [self.webView setValue:@NO forKey:@"drawsBackground"];
    self.webView.navigationDelegate = self;

    self.window.contentView = self.webView;
    [self.window orderFrontRegardless];
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

- (void)startRenderLoop {
    double fps = [self.config[@"fps"] doubleValue] ?: 59.94;
    NSTimeInterval interval = 1.0 / fps;
    
    self.renderTimer = [NSTimer scheduledTimerWithTimeInterval:interval
                                                       target:self
                                                     selector:@selector(renderFrame)
                                                     userInfo:nil
                                                      repeats:YES];
    [[NSRunLoop currentRunLoop] addTimer:self.renderTimer forMode:NSEventTrackingRunLoopMode];
    [[NSRunLoop currentRunLoop] addTimer:self.renderTimer forMode:NSDefaultRunLoopMode];
}

- (void)renderFrame {
    if (!self.syphonServer || self.isCapturing) return;
    
    // Only capture if clients are connected or periodically for thumbnail
    CGFloat width = [self.config[@"width"] floatValue] ?: 1920.0;
    CGFloat height = [self.config[@"height"] floatValue] ?: 1080.0;
    
    self.isCapturing = YES;
    WKSnapshotConfiguration *snapConfig = [[WKSnapshotConfiguration alloc] init];
    snapConfig.rect = NSMakeRect(0, 0, width, height);

    [self.webView takeSnapshotWithConfiguration:snapConfig completionHandler:^(NSImage * _Nullable snapshotImage, NSError * _Nullable error) {
        if (snapshotImage && !error) {
            [self publishImageToSyphon:snapshotImage width:width height:height];
        }
        self.isCapturing = NO;
    }];
}

- (void)publishImageToSyphon:(NSImage *)image width:(CGFloat)width height:(CGFloat)height {
    CGImageRef cgImage = [image CGImageForProposedRect:NULL context:NULL hints:nil];
    if (!cgImage) return;

    size_t w = CGImageGetWidth(cgImage);
    size_t h = CGImageGetHeight(cgImage);
    
    // Prepare straight RGBA pixel buffer
    NSMutableData *pixelData = [NSMutableData dataWithLength:w * h * 4];
    CGColorSpaceRef colorSpace = CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
    CGContextRef ctx = CGBitmapContextCreate(pixelData.mutableBytes,
                                             w, h, 8, w * 4,
                                             colorSpace,
                                             kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big);
    CGContextDrawImage(ctx, CGRectMake(0, 0, w, h), cgImage);
    CGContextRelease(ctx);
    CGColorSpaceRelease(colorSpace);

    CGLSetCurrentContext(self.glContext);
    glBindTexture(GL_TEXTURE_2D, self.textureId);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, (GLsizei)w, (GLsizei)h, 0, GL_RGBA, GL_UNSIGNED_BYTE, pixelData.bytes);

    NSRect region = NSMakeRect(0, 0, w, h);
    NSSize size = NSMakeSize(w, h);
    [self.syphonServer publishFrameTexture:self.textureId
                             textureTarget:GL_TEXTURE_2D
                               imageRegion:region
                         textureDimensions:size
                                   flipped:YES];
}

- (void)webView:(WKWebView *)webView didFinishNavigation:(WKNavigation *)navigation {
    NSLog(@"[PIXEL Syphon Renderer] Web overlay loaded and ready.");
}

- (void)applicationWillTerminate:(NSNotification *)notification {
    [self.syphonServer stop];
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
