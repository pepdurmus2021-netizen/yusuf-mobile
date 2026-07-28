import { useState, useRef } from 'react';
import {
  Modal, View, Image, TouchableOpacity, Text, StyleSheet,
  Dimensions, ActivityIndicator, PanResponder,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const SCREEN = Dimensions.get('window');
const CROP_SIZE = Math.min(SCREEN.width, SCREEN.height) * 0.78;
const IMG_SIZE = SCREEN.width;

interface Props {
  visible: boolean;
  imageUri: string;
  onConfirm: (uri: string) => void;
  onCancel: () => void;
}

export default function CircularCropModal({ visible, imageUri, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const lastOffset = useRef({ x: 0, y: 0 });
  const lastDistance = useRef<number | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastOffset.current = { x: 0, y: 0 };
        lastDistance.current = null;
      },
      onPanResponderMove: (evt, gs) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (lastDistance.current !== null) {
            const delta = dist / lastDistance.current;
            setScale(s => Math.min(Math.max(s * delta, 0.5), 4));
          }
          lastDistance.current = dist;
        } else {
          const dx = gs.dx - lastOffset.current.x;
          const dy = gs.dy - lastOffset.current.y;
          lastOffset.current = { x: gs.dx, y: gs.dy };
          setOffset(o => ({ x: o.x + dx, y: o.y + dy }));
        }
      },
      onPanResponderRelease: () => { lastDistance.current = null; },
    })
  ).current;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // Görüntünün gerçek boyutlarını al
      const imgSize: { width: number; height: number } = await new Promise((resolve, reject) => {
        Image.getSize(imageUri, (w, h) => resolve({ width: w, height: h }), reject);
      });

      // Ekranda gösterilen görüntü boyutu (scale=1 iken IMG_SIZE x IMG_SIZE)
      const displayedW = IMG_SIZE * scale;
      const displayedH = IMG_SIZE * scale;

      // Piksel başına gerçek piksel oranı
      const ratioX = imgSize.width / displayedW;
      const ratioY = imgSize.height / displayedH;

      // Canvas merkezi = görüntü merkezi (offset=0 iken)
      // Görüntünün sol üst köşesi canvas'ta:
      const imgLeft = (SCREEN.width - displayedW) / 2 + offset.x;
      const imgTop  = (SCREEN.height - displayedH) / 2 + offset.y;

      // Daire merkezi canvas'ta:
      const circleX = SCREEN.width / 2;
      const circleY = SCREEN.height / 2;

      // Dairenin sol üst köşesi canvas'ta:
      const cropLeft = circleX - CROP_SIZE / 2;
      const cropTop  = circleY - CROP_SIZE / 2;

      // Görüntü koordinatlarına dönüştür:
      const originX = Math.max(0, (cropLeft - imgLeft) * ratioX);
      const originY = Math.max(0, (cropTop  - imgTop)  * ratioY);
      const cropW   = Math.min(CROP_SIZE * ratioX, imgSize.width  - originX);
      const cropH   = Math.min(CROP_SIZE * ratioY, imgSize.height - originY);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { crop: { originX, originY, width: cropW, height: cropH } },
          { resize: { width: 400, height: 400 } },
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      onConfirm(result.uri);
    } catch {
      // Fallback: sadece merkezi kırp
      try {
        const result = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 400, height: 400 } }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
        );
        onConfirm(result.uri);
      } catch {
        onConfirm(imageUri);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.root}>

        {/* Görüntü + sürükleme alanı */}
        <View style={s.canvas} {...panResponder.panHandlers}>
          <Image
            source={{ uri: imageUri }}
            style={[s.img, { transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale }] }]}
            resizeMode="cover"
          />

          {/* Karanlık maske */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={s.maskTop} />
            <View style={s.maskMiddle}>
              <View style={s.maskSide} />
              <View style={s.hole} />
              <View style={s.maskSide} />
            </View>
            <View style={s.maskBottom} />
          </View>

          {/* Daire çerçevesi */}
          <View style={s.circleBorder} pointerEvents="none" />
        </View>

        {/* Üst bar */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={onCancel} style={s.topBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color="#fff" />
            <Text style={s.topBtnTxt}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={s.topTitle}>{t('crop.title')}</Text>
          <TouchableOpacity onPress={handleConfirm} disabled={saving} style={s.topBtn} activeOpacity={0.7}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Text style={[s.topBtnTxt, { color: '#a5f3fc' }]}>{t('common.save')}</Text><Ionicons name="checkmark" size={20} color="#a5f3fc" /></>
            }
          </TouchableOpacity>
        </View>

        {/* Alt hint */}
        <View style={s.bottomBar}>
          <View style={s.hintRow}>
            <Ionicons name="move-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={s.hint}>{t('crop.drag')}</Text>
          </View>
          <View style={s.hintDot} />
          <View style={s.hintRow}>
            <Ionicons name="expand-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={s.hint}>{t('crop.pinch')}</Text>
          </View>
        </View>

      </View>
    </Modal>
  );
}

const MASK_SIDE_V = (SCREEN.height - CROP_SIZE) / 2;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  canvas: { ...StyleSheet.absoluteFillObject },
  img: {
    position: 'absolute',
    width: IMG_SIZE, height: IMG_SIZE,
    top: (SCREEN.height - IMG_SIZE) / 2,
    left: 0,
  },

  maskTop:    { height: MASK_SIDE_V, backgroundColor: 'rgba(0,0,0,0.72)' },
  maskMiddle: { height: CROP_SIZE, flexDirection: 'row' },
  maskSide:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },
  hole:       { width: CROP_SIZE, height: CROP_SIZE, borderRadius: CROP_SIZE / 2, backgroundColor: 'transparent' },
  maskBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)' },

  circleBorder: {
    position: 'absolute',
    top: MASK_SIDE_V,
    left: (SCREEN.width - CROP_SIZE) / 2,
    width: CROP_SIZE, height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 54, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 70 },
  topTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  topBtnTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12,
    paddingVertical: 20, paddingBottom: 36,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600' },
  hintDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
});
