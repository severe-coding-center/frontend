import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, Text } from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import RNFS from "react-native-fs";
import Sound from "react-native-sound";
import RNFetchBlob from 'react-native-blob-util';

export default function CameraScreen() {
    const cameraRef = useRef<Camera>(null);
    const device = useCameraDevice("back");
    const soundRef = useRef<Sound | null>(null); // ✨ 1. useState를 useRef로 변경

    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    // const [currentSound, setCurrentSound] = useState<Sound | null>(null); // ❌ 제거
    const [isActive, setIsActive] = useState(true);
    const [recognizedText, setRecognizedText] = useState<string | null>(null);
    const [isCameraReady, setIsCameraReady] = useState(false);

     const cameraConfig = useMemo(() => {
        if (device?.formats == null) return undefined;
        const targetFps = 1;

        // 1. FPS를 지원하는 포맷 필터링
        const supportingFormats = device.formats.filter(
            (f) => f.minFps <= targetFps && f.maxFps >= targetFps
        );

        if (supportingFormats.length > 0) {
            // 2. 해상도(photoWidth)를 기준으로 오름차순 정렬
            const sortedFormats = supportingFormats.sort(
                (a, b) => a.photoWidth - b.photoWidth
            );
            // 3. 가장 낮은 해상도 포맷을 선택
            return {
                format: sortedFormats[0],
                fps: targetFps,
            };
        }
        
        // 만약 적절한 FPS의 포맷이 없다면, 그냥 사용 가능한 포맷 중 가장 낮은 해상도를 선택
        const lowestFpsFormat = device.formats.sort((a, b) => a.photoWidth - b.photoWidth)[0];
        return { format: lowestFpsFormat, fps: lowestFpsFormat.minFps };
    }, [device?.formats]);

    useEffect(() => {
        (async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === "granted");
        })();
    }, []);

    const captureAndSend = useCallback(async () => {
    if (!isCameraReady || isProcessing || cameraRef.current == null) return;
    setIsProcessing(true);

    try {
        const photo = await cameraRef.current.takePhoto({});

        // ✨ 2. react-native-blob-util을 사용해 서버에 요청을 보냅니다.
        // 요청 방식은 FormData를 사용하는 이전 답변과 동일합니다.
        const resp = await RNFetchBlob.fetch('POST', 
            'http://myapp.210-178-40-54.nip.io/ocr-read', 
            {
                'Content-Type' : 'multipart/form-data',
            }, [
                { name : 'image', filename : 'photo.jpg', type:'image/jpeg', data: RNFetchBlob.wrap(photo.path) }
            ]
        );

        // ✨ 3. 응답 처리 방식이 완전히 바뀝니다.
        // 응답 상태가 204이면 텍스트가 없는 것이므로 여기서 함수를 종료합니다.
        if (resp.info().status === 204) {
            console.log("텍스트를 찾지 못했습니다.");
            setIsProcessing(false); // isProcessing 상태를 꼭 false로 바꿔줘야 합니다.
            return;
        }

        // 서버 오류 확인
        if (resp.info().status !== 200) {
            throw new Error(`서버 오류: ${resp.info().status}`);
        }

        // ⚠️ 중요: 서버가 텍스트를 보내주지 않으므로, 텍스트를 화면에 표시하는 코드는 제거합니다.
        // setRecognizedText(data.text);
        // setTimeout(() => setRecognizedText(null), 3000);

        // ✨ 4. base64 데이터를 직접 받아옵니다.
        // .base64() 메서드로 MP3 파일 데이터를 바로 base64 문자열로 변환할 수 있습니다.
        const audioBase64 = resp.base64();

        const outPath = `${RNFS.CachesDirectoryPath}/ocr_tts.mp3`;
        await RNFS.writeFile(outPath, audioBase64, "base64");
        
        // --- 사운드 재생 부분은 기존과 동일 ---
        if (soundRef.current) {
            soundRef.current.stop(() => soundRef.current?.release());
        }

        const sound = new Sound(outPath, "", (error) => {
            if (error) {
                console.log('failed to load the sound', error);
                return;
            }
            sound.play(() => sound.release());
        });
        soundRef.current = sound;

    } catch (err: any) {
        if (String(err).includes("Camera is closed")) {
            console.log("📷 Camera already closed, ignore");
        } else {
            console.error("캡처 및 전송 오류:", err);
        }
    } finally {
        setIsProcessing(false);
    }
}, [isProcessing, isCameraReady]);

    useEffect(() => {
        let cancelled = false;
        const loop = async () => {
            if (!device || hasPermission !== true || cancelled) return;
            await captureAndSend();
            if (!cancelled) setTimeout(loop, 10000);
        };
        loop();

        return () => {
            cancelled = true;
            // ✨ 3. soundRef.current를 사용하여 정리
            if (soundRef.current) {
                soundRef.current.stop(() => soundRef.current?.release());
            }
        };
    }, [device, hasPermission, captureAndSend]);

    if (hasPermission === null || !device || !cameraConfig) {
        return <View style={styles.center}><Text>카메라 로딩 중...</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.center}><Text>카메라 권한이 없습니다</Text></View>;
    }

    return (
        <View style={{ flex: 1 }}>
            <Camera
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isActive}
                photo={true}
                format={cameraConfig.format}
                fps={cameraConfig.fps}
                onInitialized={() => {
                    console.log("Camera ready!");
                    setIsCameraReady(true);
                }}
            />
            {isProcessing && (
                <View style={styles.overlay}>
                    <Text style={styles.processingText}>인식중...</Text>
                </View>
            )}
            {recognizedText && (
                <View style={styles.textOverlay}>
                    <Text style={styles.textDisplay}>{recognizedText}</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  processingText: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  textOverlay: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  textDisplay: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
});