#!/usr/bin/env bash
# Runs inside the Android emulator job: installs the APK and screenshots the main screens.
set -x
APK=$(ls app/android/app/build/outputs/apk/release/*.apk | head -1)
mkdir -p android-shots
adb install -r "$APK"
shot() { sleep "${2:-6}"; adb exec-out screencap -p > "android-shots/$1.png"; }
# tap the centre of the first element whose text or content-desc matches $1
tap() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml /tmp/ui.xml >/dev/null 2>&1
  python3 - "$1" <<'PY'
import re,sys,subprocess
want=sys.argv[1]; xml=open('/tmp/ui.xml',encoding='utf-8',errors='ignore').read()
for m in re.finditer(r'<node [^>]*>', xml):
    n=m.group(0)
    t=re.search(r' text="([^"]*)"',n); d=re.search(r'content-desc="([^"]*)"',n)
    if (t and want in t.group(1)) or (d and want == d.group(1)):
        b=re.search(r'bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',n); x1,y1,x2,y2=map(int,b.groups())
        subprocess.run(['adb','shell','input','tap',str((x1+x2)//2),str((y1+y2)//2)]); print('tapped',want); break
else: print('not found',want)
PY
}
adb shell am start -n church.agape.app/.MainActivity
shot 00-welcome 35
tap "Continue with Apple"
shot 01-home 8
for i in 1 2 3 4 5 6; do adb shell input swipe 540 1900 540 750 450; shot "01-home-$i" 3; done
for t in Watch Grow Family Me; do tap "$t"; shot "tab-$t" 6; adb shell input swipe 540 1900 540 900 450; shot "tab-$t-2" 3; done
for r in prayer give games events rides assistant; do
  adb shell am start -W -a android.intent.action.VIEW -d "agape://$r" church.agape.app
  shot "$r" 8
  adb shell input swipe 540 1900 540 900 450
  shot "$r-2" 3
done
ls -la android-shots
