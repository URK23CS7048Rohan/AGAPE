#!/usr/bin/env bash
# Runs inside the Android emulator job: installs the APK and screenshots the main screens.
set -x
APK=$(ls app/android/app/build/outputs/apk/release/*.apk | head -1)
mkdir -p android-shots
adb install -r "$APK"
shot() { sleep "${2:-6}"; adb exec-out screencap -p > "android-shots/$1.png"; }
adb shell am start -n church.agape.app/.MainActivity
shot 01-home 30
for i in 1 2 3 4 5; do adb shell input swipe 540 1900 540 700 500; shot "01-home-$i" 3; done
for r in prayer give games watch grow community events rides; do
  adb shell am start -W -a android.intent.action.VIEW -d "agape://$r" church.agape.app
  shot "$r" 8
  adb shell input swipe 540 1900 540 900 500
  shot "$r-2" 3
done
ls -la android-shots
