import React, { useState } from "react";
import { Modal, View } from "react-native";
import { C, R } from "@/theme";
import { Body, Icon, Press } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useReaderPrefs } from "@/lib/scripture";
import { LANGS, langInfo, normalizeLang, t } from "@/lib/i18n";

/** Language list in a sheet. Choosing one also switches the Bible to that language's translation. */
export function LanguageSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { settings, setSetting } = useAuth();
  const [, setPrefs] = useReaderPrefs();
  const cur = normalizeLang(settings.language);
  const pick = (code: string) => {
    onClose();
    if (code === cur) return;
    setPrefs({ tr: langInfo(code as any).bible });
    setSetting("language", code);
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Press onPress={onClose} scaleTo={1} haptic={false} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
        <View onStartShouldSetResponder={() => true} style={{ backgroundColor: C.bg, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: 18, paddingBottom: 34, gap: 8 }}>
          <Body weight="bold" size={18} style={{ marginBottom: 6 }}>{t("Language")}</Body>
          {LANGS.map((l) => {
            const on = l.code === cur;
            return (
              <Press key={l.code} onPress={() => pick(l.code)} scaleTo={0.98} style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 56, paddingHorizontal: 16, borderRadius: 16, backgroundColor: on ? C.ink : "#fff", borderWidth: 1.5, borderColor: on ? C.ink : C.line }}>
                <Body weight="bold" size={16} color={on ? "#fff" : C.ink} style={{ flex: 1 }}>{l.name}</Body>
                <Body size={13} color={on ? "rgba(255,255,255,0.7)" : C.muted}>{l.english}</Body>
                {on ? <Icon name="check" size={18} color="#fff" /> : null}
              </Press>
            );
          })}
        </View>
      </Press>
    </Modal>
  );
}

/** Small "globe + language" button that opens the sheet. */
export function LanguageButton({ dark }: { dark?: boolean }) {
  const { settings } = useAuth();
  const [open, setOpen] = useState(false);
  const fg = dark ? "#fff" : C.ink;
  return (
    <>
      <Press onPress={() => setOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1.5, borderColor: dark ? "rgba(255,255,255,0.3)" : C.line, backgroundColor: dark ? "transparent" : "#fff" }}>
        <Icon name="globe" size={14} color={fg} />
        <Body size={13} weight="semi" color={fg}>{langInfo(normalizeLang(settings.language)).name}</Body>
      </Press>
      <LanguageSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
