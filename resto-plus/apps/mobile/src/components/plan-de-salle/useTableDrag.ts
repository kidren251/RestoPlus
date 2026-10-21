import { useEffect, useMemo, useRef } from "react";
import { Animated, PanResponder } from "react-native";
import type { Table } from "@resto-plus/types";

/**
 * Glisser-déposer d'une table sur le canvas (mode admin).
 * Un geste de moins de 3 px est traité comme un tap (`onPress`), sinon la table est
 * déplacée, bornée au canvas, et sa position logique est remontée via `onDragEnd`.
 */
export function useTableDrag({
  table,
  scale,
  enabled,
  canvasSize,
  onPress,
  onDragEnd,
}: {
  table: Table;
  scale: number;
  enabled: boolean;
  canvasSize: { w: number; h: number };
  onPress: () => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const pan = useRef(new Animated.ValueXY({ x: table.x * scale, y: table.y * scale })).current;
  const lastOffset = useRef({ x: table.x * scale, y: table.y * scale });
  const didDrag = useRef(false);

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => enabled,
      onMoveShouldSetPanResponder: (_, gesture) =>
        enabled && (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3),
      onPanResponderGrant: () => {
        didDrag.current = false;
        pan.setOffset(lastOffset.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3) {
          didDrag.current = true;
        }
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        const rawX = (pan.x as any)._value;
        const rawY = (pan.y as any)._value;
        const maxX = (canvasSize.w - table.largeur) * scale;
        const maxY = (canvasSize.h - table.hauteur) * scale;
        const clampedX = Math.max(0, Math.min(rawX, Math.max(maxX, 0)));
        const clampedY = Math.max(0, Math.min(rawY, Math.max(maxY, 0)));
        pan.setValue({ x: clampedX, y: clampedY });
        lastOffset.current = { x: clampedX, y: clampedY };

        if (didDrag.current) {
          onDragEnd(Math.round(clampedX / scale), Math.round(clampedY / scale));
        } else {
          onPress();
        }
      },
    }),
    [canvasSize.h, canvasSize.w, enabled, onDragEnd, onPress, scale, table.hauteur, table.largeur]
  );

  // Position recalculée quand la table bouge (autre appareil, store) ou que l'échelle change.
  useEffect(() => {
    const x = table.x * scale;
    const y = table.y * scale;
    pan.setValue({ x, y });
    lastOffset.current = { x, y };
  }, [pan, scale, table.x, table.y]);

  return { pan, panHandlers: panResponder.panHandlers };
}
