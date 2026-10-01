#!/usr/bin/env bash
# Runs inside the Android emulator job: installs the APK and screenshots the main screens.
set -x
APK=$(ls app/android/app/build/outputs/apk/release/*.apk | head -1)
mkdir -p android-shots
adb install -r "$APK"
shot() { sleep "${2:-6}"; adb exec-out screencap -p > "android-shots/$1.png"; }
# tap the centre of the first element whose text or content-desc matches $1;
# if uiautomator can't read the screen (endless animations keep it from going idle), tap $2,$3 instead
tap() {
  FX=$2; FY=$3
  rm -f /tmp/ui.xml; adb shell rm -f /sdcard/ui.xml; adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml /tmp/ui.xml >/dev/null 2>&1
  python3 - "$1" <<'PY'
import re,sys,subprocess
want=sys.argv[1]; xml=open('/tmp/ui.xml',encoding='utf-8',errors='ignore').read()
for m in re.finditer(r'<node [^>]*>', xml):
    n=m.group(0)
    t=re.search(r' text="([^"]*)"',n); d=re.search(r'content-desc="([^"]*)"',n)
    if (t and want in t.group(1)) or (d and want == d.group(1)):
        b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n); x1,y1,x2,y2=map(int,b.groups())
        subprocess.run(['adb','shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)]); print('tapped',want); break
else:
    print('not found',want); sys.exit(3)
PY
  if [ $? -ne 0 ] && [ -n "$FX" ]; then adb shell input tap "$FX" "$FY"; echo "tapped $1 at $FX,$FY"; fi
}
# the emulator's own launcher sometimes throws an "isn't responding" box on slow CI machines — hide/dismiss it
adb shell settings put global hide_error_dialogs 1
dismiss() { adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS >/dev/null 2>&1; tap "Wait" >/dev/null 2>&1; }
sleep 20; dismiss
adb shell am start -n church.agape.app/.MainActivity
sleep 30; dismiss
shot 00-welcome 2
tap "Continue with Apple" 540 1890
sleep 6; dismiss
shot 01-home 2
for i in 1 2 3 4 5 6; do adb shell input swipe 540 1900 540 750 450; shot "01-home-$i" 3; done
X_Watch=341; X_Grow=539; X_Family=737; X_Me=935
for t in Watch Grow Family Me; do dismiss; xv="X_$t"; tap "$t" "${!xv}" 2235; shot "tab-$t" 6; adb shell input swipe 540 1900 540 900 450; shot "tab-$t-2" 3; done
for r in prayer give games events rides assistant; do
  dismiss
  adb shell am start -W -a android.intent.action.VIEW -d "agape://$r" church.agape.app
  sleep 6; dismiss
  shot "$r" 2
  adb shell input swipe 540 1900 540 900 450
  shot "$r-2" 3
  if [ "$r" = rides ]; then shot rides-3 14; fi
done
ls -la android-shots
