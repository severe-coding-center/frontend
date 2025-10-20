import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, StyleSheet, Text } from "react-native";
import { Camera, useCameraDevice } from "react-native-vision-camera";
import RNFS from "react-native-fs";
import Sound from "react-native-sound";
import RNFetchBlob from 'react-native-blob-util';
import Config from "react-native-config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = Config.BACKEND_URL;

export default function CameraScreen() {
    const cameraRef = useRef<Camera>(null);
    const device = useCameraDevice("back");
    const soundRef = useRef<Sound | null>(null); // ✨ 1. useState를 useRef로 변경

    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isActive, setIsActive] = useState(true);
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

    const captureAndSend = useCallback(async (): Promise<void> => {
    if (!isCameraReady || isProcessing || cameraRef.current == null) return;
    setIsProcessing(true);

    try {
        const photo = await cameraRef.current.takePhoto({});
        console.log('방금 찍은 사진 경로:', photo.path);
        const accessToken = await AsyncStorage.getItem('accessToken');

        // ✨ 2. react-native-blob-util을 사용해 서버에 요청을 보냅니다.
        // 요청 방식은 FormData를 사용하는 이전 답변과 동일합니다.
        const ocrResp = await RNFetchBlob.fetch('POST', 
            `${BASE_URL}/api/ocr/upload`, 
            {
                'Content-Type' : 'multipart/form-data',
                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
            }, [
                { name : 'image', filename : 'photo.jpg', type:'image/jpeg', data: RNFetchBlob.wrap(photo.path) }
            ]
        );

        // 1. (추가) 텍스트가 없을 때 (204 No Content) 처리
        if (ocrResp.info().status === 204) {
            console.log("텍스트를 찾지 못했습니다.");
            return; // 오디오 처리 없이 함수 종료
        }

        // 서버 오류 확인
        if (ocrResp.info().status !== 200) {
            throw new Error(`서버 오류: ${ocrResp.info().status}`);
        }

        const audioBase64 = ocrResp.base64();

        const outPath = `${RNFS.CachesDirectoryPath}/ocr_tts.mp3`;
        await RNFS.writeFile(outPath, audioBase64, "base64");
        
        // --- 사운드 재생 부분은 기존과 동일 ---
        if (soundRef.current) {
            soundRef.current.stop(() => soundRef.current?.release());
        }

        return new Promise((resolve, reject) => {
                const sound = new Sound(outPath, "", (error) => {
                    if (error) {
                        console.log('failed to load the sound', error);
                        reject(error); // 로딩 실패 시 Promise를 reject합니다.
                        return;
                    }
                    
                    // 재생이 끝나면 Promise를 resolve()하여 루프가 다음으로 진행되게 합니다.
                    sound.play((success) => {
                        if (success) {
                            console.log('successfully finished playing');
                        } else {
                            console.log('playback failed due to audio decoding errors');
                        }
                        sound.release(); // 사운드 리소스 해제
                        resolve(); // 재생 완료!
                    });
                });
                soundRef.current = sound;
            });

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
            if (!cancelled) setTimeout(loop, 5000);
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