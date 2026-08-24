import Foundation
import Cocoa
import WebKit
import CoreGraphics
import IOSurface

// Config Schema
struct RendererConfig: Codable {
    var sourceName: String
    var host: String
    var port: Int
    var overlayPath: String
    var width: Int
    var height: Int
    var fps: Double
    var alpha: Bool
}

class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var config: RendererConfig!
    var displayTimer: Timer?
    var serverTitle: String = "PIXEL Graphics"

    func applicationDidFinishLaunching(_ notification: Notification) {
        loadConfig()
        setupTransparentWebView()
        loadOverlayURL()
        print("[PIXEL Graphics Renderer] Started successfully.")
        print("[PIXEL Graphics Renderer] Source Name: \(config.sourceName)")
        print("[PIXEL Graphics Renderer] URL: http://\(config.host):\(config.port)\(config.overlayPath)")
        print("[PIXEL Graphics Renderer] Resolution: \(config.width)x\(config.height) @ \(config.fps)fps (Alpha: \(config.alpha))")
    }

    func loadConfig() {
        let currentDir = FileManager.default.currentDirectoryPath
        let configPath = URL(fileURLWithPath: currentDir).appendingPathComponent("config.json").path
        if let data = FileManager.default.contents(atPath: configPath),
           let decoded = try? JSONDecoder().decode(RendererConfig.self, from: data) {
            config = decoded
        } else {
            config = RendererConfig(
                sourceName: "PIXEL Graphics",
                host: "127.0.0.1",
                port: 8081,
                overlayPath: "/graphics/volleyball/volleyball-master-overlay.html",
                width: 1920,
                height: 1080,
                fps: 59.94,
                alpha: true
            )
        }
        serverTitle = config.sourceName
    }

    func setupTransparentWebView() {
        let contentRect = NSRect(x: 0, y: 0, width: config.width, height: config.height)
        window = NSWindow(
            contentRect: contentRect,
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        window.isOpaque = false
        window.hasShadow = false
        window.backgroundColor = NSColor.clear
        window.level = .floating
        window.ignoresMouseEvents = true

        let webConfig = WKWebViewConfiguration()
        webConfig.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        
        webView = WKWebView(frame: contentRect, configuration: webConfig)
        webView.setValue(false, forKey: "drawsBackground")
        webView.navigationDelegate = self
        
        window.contentView = webView
        window.orderFrontRegardless()
    }

    func loadOverlayURL() {
        let urlString = "http://\(config.host):\(config.port)\(config.overlayPath)"
        guard let url = URL(string: urlString) else {
            print("[PIXEL Graphics Renderer] Invalid URL: \(urlString)")
            return
        }
        let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData, timeoutInterval: 10)
        webView.load(request)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("[PIXEL Graphics Renderer] Web overlay loaded successfully into GPU context.")
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("[PIXEL Graphics Renderer] Web navigation failed: \(error.localizedDescription)")
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = AppDelegate()
app.delegate = delegate
app.run()
