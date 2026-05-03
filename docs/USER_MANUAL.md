# User Manual — Food Diary

Food Diary is an Android app for tracking daily meal intake. You can log meals by photographing your food and letting the app identify it automatically, or by searching ingredients and building a meal manually. All logged meals are stored in your diary with calorie totals grouped by day.

---

## Getting started — installation

1. Download the APK file: [APK download — link to be added]
2. On your Android device, open Settings → Apps → Special app access → Install unknown apps. Enable installation for your browser or file manager.
3. Open the downloaded APK file and tap Install.
4. The Food Diary icon will appear on your home screen. Tap it to open the app.

The login screen appears when the app opens for the first time.

---

## Flow 1 — Creating an account

1. On the login screen, tap Create account.
2. Enter your email address and a password.
3. Tap Create account.
4. If no email verification is required, the app takes you directly to the Diary tab.
5. If email verification is required, a code verification screen appears. Check your inbox for a 6-digit code and enter it in the field shown.
6. Tap Verify.
7. If the code has not arrived, tap Resend code. You can request a new code once every 30 seconds.
8. After successful verification, the app takes you to the Diary tab.

---

## Flow 2 — Logging in

1. On the login screen, enter your registered email and password.
2. Tap Sign in.
3. If the credentials are incorrect, an error message appears below the button. Check your email and password and try again.
4. When login succeeds, the app takes you to the Diary tab.

---

## Flow 3 — Setting up a profile

1. Tap the Profile tab (person icon, far right of the bottom navigation bar).
2. Fill in your details:
   - Age — whole number
   - Sex — tap to choose: Male, Female, or Other
   - Weight — kilograms
   - Height — centimetres
   - Goal — tap to choose: Weight loss, Muscle gain, Being healthier, or Other
   - Dietary preference — tap to choose: Unrestricted, Vegan, Vegetarian, or Pescetarian
   - Activity level — tap to choose: Sedentary, Lightly active, Moderately active, or Very active
3. As you type your weight and height, the BMI badge updates automatically. The colour indicates your BMI category:
   - Blue — underweight (BMI below 18.5)
   - Green — normal (18.5 to 24.9)
   - Orange — overweight (25.0 to 29.9)
   - Red — obese (30.0 and above)
4. Tap Save profile. Your profile is stored and will appear the next time you open the tab.

---

## Flow 4 — Logging a meal with a photo

1. Tap the Photo Log tab (camera icon).
2. Choose how to add an image:
   - Take photo — opens the camera. Point at your food and tap the shutter button.
   - Choose from gallery — opens your photo library. Tap the image you want to use.
3. The image is sent to the server for analysis. A loading indicator appears while this happens.
4. When analysis completes, the image appears with coloured bounding boxes drawn over each detected food region. Each box is labelled with the top dish candidate.
5. Below the image, one card appears per detected region. Each card lists up to five dish candidates. The highest-confidence candidate is selected by default.
6. If the default selection is wrong, tap a different candidate in the list to select it.
7. Tap Confirm selection. The app sends your choices to the server and fetches calorie information.
8. A serving size field appears showing the default gram weight. Edit the number to adjust the portion — the calorie total updates as you type.
9. Tap Save to diary. The entry is added to your diary and the screen resets.
10. Tap Discard to cancel without saving.

---

## Flow 5 — Logging a meal manually

1. Tap the Manual Log tab (pencil icon).
2. Type an ingredient name in the search box. Results appear from a locally cached list — no internet connection is needed for filtering.
3. Tap an ingredient to add it to your basket.
4. Repeat steps 2 and 3 for each ingredient in the meal.
5. In the basket, each ingredient shows a gram input. Edit the number to adjust the portion size.
6. Tap Calculate kcal. The app computes the total calories for the basket.
7. Tap Save to diary. The entry is added to your diary and the basket clears.

---

## Flow 6 — Viewing the diary

1. Tap the Diary tab (open book icon).
2. Entries are grouped by date, with the most recent date at the top. Each date header shows the total calories logged that day.
3. Each entry shows the food name, gram amount, and calorie count.
4. For photo entries, a thumbnail appears on the left side of the row. Tap the thumbnail to open a full-screen view of the image. Tap anywhere outside the image to close it.
5. To delete an entry, swipe the row to the left. A delete button appears on the right — tap it to remove the entry.
6. Pull down on the list to refresh and reload entries from the server.
7. If no meals have been logged yet, the screen shows an empty state message.

---

## Signing out

Tap the Profile tab and scroll to the bottom. Tap Sign out. The app clears your session and returns to the login screen.
