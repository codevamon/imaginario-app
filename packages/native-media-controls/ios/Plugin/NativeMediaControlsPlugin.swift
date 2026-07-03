import Foundation
import UIKit
import Capacitor
import AVFoundation
import MediaPlayer

@objc(NativeMediaControlsPlugin)
public class NativeMediaControlsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeMediaControlsPlugin"
    public let jsName = "NativeMediaControls"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setMetadata", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPlaybackState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPosition", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    private var remoteCommandsConfigured = false

    private func updateNowPlayingInfo(_ updates: [String: Any]) {
        DispatchQueue.main.async {
            var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
            for (key, value) in updates {
                info[key] = value
            }
            MPNowPlayingInfoCenter.default().nowPlayingInfo = info
            print("[NativeMediaControls][iOS] nowPlayingInfo keys:", Array(info.keys))
        }
    }

    private func clearNowPlayingInfo() {
        DispatchQueue.main.async {
            MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
            print("[NativeMediaControls][iOS] nowPlayingInfo cleared")
        }
    }

    private func emitEvent(_ name: String) {
        DispatchQueue.main.async { [weak self] in
            self?.notifyListeners(name, data: [:])
        }
    }

    private func configureRemoteCommands() {
        guard !remoteCommandsConfigured else { return }
        remoteCommandsConfigured = true

        let commandCenter = MPRemoteCommandCenter.shared()

        commandCenter.playCommand.isEnabled = true
        commandCenter.playCommand.addTarget { [weak self] _ in
            self?.emitEvent("nativeMediaPlay")
            return .success
        }

        commandCenter.pauseCommand.isEnabled = true
        commandCenter.pauseCommand.addTarget { [weak self] _ in
            self?.emitEvent("nativeMediaPause")
            return .success
        }

        commandCenter.stopCommand.isEnabled = true
        commandCenter.stopCommand.addTarget { [weak self] _ in
            self?.emitEvent("nativeMediaStop")
            return .success
        }
    }

    @objc func configure(_ call: CAPPluginCall) {
        print("[NativeMediaControls][iOS] configure CALLED")
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            configureRemoteCommands()
            DispatchQueue.main.async {
                UIApplication.shared.beginReceivingRemoteControlEvents()
            }
            print("[NativeMediaControls][iOS] configure")
            call.resolve()
        } catch {
            print("[NativeMediaControls][iOS] configure failed: \(error.localizedDescription)")
            call.reject("Failed to configure AVAudioSession", nil, error)
        }
    }

    @objc func setMetadata(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? ""
        let artist = call.getString("artist") ?? ""
        let duration = call.getDouble("duration")
        print("[NativeMediaControls][iOS] setMetadata CALLED title=\(title) artist=\(artist) duration=\(duration.map { String($0) } ?? "nil")")

        var updates: [String: Any] = [:]

        if let title = call.getString("title") {
            updates[MPMediaItemPropertyTitle] = title
        }
        if let artist = call.getString("artist") {
            updates[MPMediaItemPropertyArtist] = artist
        }
        if let album = call.getString("album") {
            updates[MPMediaItemPropertyAlbumTitle] = album
        }
        if let duration = call.getDouble("duration"), duration > 0 {
            updates[MPMediaItemPropertyPlaybackDuration] = duration
        }
        updates[MPNowPlayingInfoPropertyMediaType] = MPNowPlayingInfoMediaType.audio.rawValue

        updateNowPlayingInfo(updates)
        print("[NativeMediaControls][iOS] setMetadata")
        call.resolve()
    }

    @objc func setPlaybackState(_ call: CAPPluginCall) {
        let state = call.getString("state") ?? "none"
        print("[NativeMediaControls][iOS] setPlaybackState CALLED state=\(state)")

        if state == "playing" {
            DispatchQueue.main.async {
                var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
                let elapsed = info[MPNowPlayingInfoPropertyElapsedPlaybackTime] as? Double ?? 0
                info[MPNowPlayingInfoPropertyPlaybackRate] = 1.0
                info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsed
                info[MPNowPlayingInfoPropertyMediaType] = MPNowPlayingInfoMediaType.audio.rawValue
                MPNowPlayingInfoCenter.default().nowPlayingInfo = info
                print("[NativeMediaControls][iOS] nowPlayingInfo keys:", Array(info.keys))
            }
        } else {
            updateNowPlayingInfo([MPNowPlayingInfoPropertyPlaybackRate: 0.0])
        }

        print("[NativeMediaControls][iOS] setPlaybackState \(state)")
        call.resolve()
    }

    @objc func setPosition(_ call: CAPPluginCall) {
        let position = call.getDouble("position") ?? 0
        let duration = call.getDouble("duration")
        let playbackRate = call.getDouble("playbackRate")
        print("[NativeMediaControls][iOS] setPosition CALLED position=\(position) duration=\(duration.map { String($0) } ?? "nil") playbackRate=\(playbackRate.map { String($0) } ?? "nil")")

        var updates: [String: Any] = [
            MPNowPlayingInfoPropertyElapsedPlaybackTime: position,
        ]

        if let duration = call.getDouble("duration"), duration > 0 {
            updates[MPMediaItemPropertyPlaybackDuration] = duration
        }
        if let playbackRate = call.getDouble("playbackRate") {
            updates[MPNowPlayingInfoPropertyPlaybackRate] = playbackRate
        }

        updateNowPlayingInfo(updates)
        print("[NativeMediaControls][iOS] setPosition")
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        print("[NativeMediaControls][iOS] clear CALLED")
        clearNowPlayingInfo()
        print("[NativeMediaControls][iOS] clear")
        call.resolve()
    }
}
