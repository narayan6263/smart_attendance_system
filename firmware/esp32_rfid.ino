// // ESP32 RFID Attendance - 2 room LEDs
// //
// // RC522 wiring:   SDA(SS)=GPIO5, RST=GPIO4, SCK=GPIO25, MISO=GPIO26, MOSI=GPIO23, 3.3V, GND
// // LED wiring:     GREEN (+) -> GPIO27 -> 220 ohm -> LED -> GND
// //                 RED   (+) -> GPIO32 -> 220 ohm -> LED -> GND
// //
// // GREEN blinking = scan window open (first 10 min of lecture)
// // GREEN solid    = teacher pressed "Allow scanning"
// // RED solid      = closed / no lecture / no connection to server

// #include <WiFi.h>
// #include <HTTPClient.h>
// #include <SPI.h>
// #include <MFRC522.h>

// // ================= RFID PINS =================
// #define SS_PIN    5
// #define RST_PIN   4
// #define SCK_PIN   25
// #define MISO_PIN  26
// #define MOSI_PIN  23

// // ================= LED PINS ==================
// #define GREEN_LED 27
// #define RED_LED   32

// MFRC522 rfid(SS_PIN, RST_PIN);

// // ================= WIFI ======================
// const char* ssid     = "TP-Link_625C";
// const char* password = "38340871";

// // ================= SERVER ====================
// // Laptop IPv4 (ipconfig) + server PORT (9000, as in server.js). No trailing slash.
// const char* serverBase = "http://192.168.0.133:9000";
// const char* roomCode   = "R101";  // must match the room in the timetable
// const char* deviceKey  = "";      // same as DEVICE_KEY on server, or leave empty

// // ================= STATE =====================
// enum LightState { LIGHT_RED, LIGHT_GREEN_BLINK, LIGHT_GREEN_SOLID };
// LightState light = LIGHT_RED;
// bool blinkOn = false;
// unsigned long lastBlink = 0, lastPoll = 0, lastScan = 0;
// const unsigned long BLINK_MS         = 500;
// const unsigned long POLL_MS          = 2000;
// const unsigned long SCAN_COOLDOWN_MS = 1800;

// // ================= LED =======================
// void showLight() {
//   if (light == LIGHT_RED) {
//     digitalWrite(RED_LED, HIGH);
//     digitalWrite(GREEN_LED, LOW);
//   } else if (light == LIGHT_GREEN_SOLID) {
//     digitalWrite(RED_LED, LOW);
//     digitalWrite(GREEN_LED, HIGH);
//   } else {  // LIGHT_GREEN_BLINK
//     digitalWrite(RED_LED, LOW);
//     digitalWrite(GREEN_LED, blinkOn ? HIGH : LOW);
//   }
// }

// // ================= ASK SERVER FOR LIGHT ======
// void pollStatus() {
//   if (WiFi.status() != WL_CONNECTED) { light = LIGHT_RED; return; }

//   HTTPClient http;
//   http.setTimeout(3000);
//   String url = String(serverBase) + "/api/device/status?room=" + roomCode;
//   if (!http.begin(url)) { light = LIGHT_RED; return; }
//   if (strlen(deviceKey) > 0) http.addHeader("x-device-key", deviceKey);

//   int code = http.GET();
//   if (code == 200) {
//     String body = http.getString();
//     Serial.println("Status: " + body);
//     if (body.indexOf("\"light\":\"yellow\"") >= 0)      light = LIGHT_GREEN_SOLID;  // teacher allowed
//     else if (body.indexOf("\"light\":\"green\"") >= 0)  light = LIGHT_GREEN_BLINK;  // scan window open
//     else                                                light = LIGHT_RED;
//   } else {
//     light = LIGHT_RED;
//     Serial.printf("Status HTTP error: %d\n", code);
//   }
//   http.end();
//   showLight();
// }

// // ================= SEND SCAN =================
// void sendScan(const String& uid) {
//   if (WiFi.status() != WL_CONNECTED) { Serial.println("Scan failed: WiFi disconnected"); return; }

//   HTTPClient http;
//   http.setTimeout(8000);
//   if (!http.begin(String(serverBase) + "/api/scan")) { Serial.println("Cannot start scan request"); return; }
//   http.addHeader("Content-Type", "application/json");
//   if (strlen(deviceKey) > 0) http.addHeader("x-device-key", deviceKey);

//   String payload = "{\"uid\":\"" + uid + "\",\"room\":\"" + roomCode + "\"}";
//   Serial.println("Payload: " + payload);

//   int code = http.POST(payload);
//   Serial.printf("Scan HTTP status: %d\n", code);
//   if (code > 0) Serial.println("Server response: " + http.getString());
//   else          Serial.println(http.errorToString(code));
//   http.end();
// }

// // ================= SETUP =====================
// void setup() {
//   Serial.begin(115200);
//   delay(1000);

//   pinMode(GREEN_LED, OUTPUT);
//   pinMode(RED_LED, OUTPUT);
//   showLight();

//   SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
//   rfid.PCD_Init();
//   delay(100);
//   Serial.print("RFID firmware: ");
//   rfid.PCD_DumpVersionToSerial();

//   WiFi.mode(WIFI_STA);
//   WiFi.begin(ssid, password);
//   Serial.print("Connecting to WiFi");
//   while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
//   Serial.println();
//   Serial.println("WiFi connected");
//   Serial.print("ESP32 IP: ");
//   Serial.println(WiFi.localIP());
//   Serial.println("Room: " + String(roomCode));

//   pollStatus();
//   Serial.println("RFID scanner ready");
// }

// // ================= LOOP ======================
// void loop() {
//   if (WiFi.status() != WL_CONNECTED) {
//     light = LIGHT_RED;
//     showLight();
//     WiFi.reconnect();
//     delay(100);
//     return;
//   }

//   // Blink timing (non-blocking)
//   if (millis() - lastBlink >= BLINK_MS) {
//     lastBlink = millis();
//     blinkOn = !blinkOn;
//   }

//   // Refresh LED status from server every 2 seconds
//   if (millis() - lastPoll >= POLL_MS) {
//     lastPoll = millis();
//     pollStatus();
//   }
//   showLight();

//   // Card check
//   if (!rfid.PICC_IsNewCardPresent()) return;
//   if (!rfid.PICC_ReadCardSerial())  return;

//   if (millis() - lastScan < SCAN_COOLDOWN_MS) {
//     rfid.PICC_HaltA();
//     rfid.PCD_StopCrypto1();
//     return;
//   }
//   lastScan = millis();

//   // UID without spaces, uppercase
//   String uid = "";
//   for (byte i = 0; i < rfid.uid.size; i++) {
//     if (rfid.uid.uidByte[i] < 0x10) uid += "0";
//     uid += String(rfid.uid.uidByte[i], HEX);
//   }
//   uid.toUpperCase();

//   Serial.println();
//   Serial.println("CARD DETECTED");
//   Serial.println("UID: " + uid);
//   sendScan(uid);

//   rfid.PICC_HaltA();
//   rfid.PCD_StopCrypto1();
//   Serial.println("Ready for next scan");
// }


#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>

// ================= RFID PINS =================
#define SS_PIN     5
#define RST_PIN    4
#define SCK_PIN    25
#define MISO_PIN   26
#define MOSI_PIN   23

// ================= OUTPUT / INPUT PINS =======
#define GREEN_LED  27   // scan accepted
#define RED_LED    32   // invalid / unknown / closed / already marked
#define BLUE_LED   33   // system ON (blinks)
#define BUZZER_PIN 14   // active buzzer
#define BUTTON_PIN 13   // push button to GND

MFRC522 rfid(SS_PIN, RST_PIN);

// ================= WIFI ======================
const char* ssid     = "TP-Link_625C";
const char* password = "38340871";

// ================= SERVER ====================
const char* serverBase = "http://192.168.0.133:9000";
const char* roomCode   = "R101";
const char* deviceKey  = "";

// ================= TIMING ====================
const unsigned long BLINK_MS         = 500;   // blue blink speed
const unsigned long HEARTBEAT_MS     = 5000;
const unsigned long SCAN_COOLDOWN_MS = 1800;
const unsigned long BUTTON_DEBOUNCE  = 250;
const unsigned long RESULT_MS        = 1200;  // how long green/red stays on

// ================= STATE =====================
bool systemOn = false;
bool blinkOn = false;
bool lastButtonRaw = HIGH;
unsigned long lastBlink = 0, lastHeartbeat = 0, lastScan = 0, lastButtonTime = 0, lastWifiTry = 0;

struct ScanResult { bool ok; String event; String name; };

// ================= NON-BLOCKING BUZZER =======
// Sequence: ON ms, OFF ms, ON ms, ... , 0 = end
const uint16_t BEEP_ON_SEQ[]   = {150, 0};
const uint16_t BEEP_OFF_SEQ[]  = {60, 0};
const uint16_t OK_SEQ[]        = {120, 100, 120, 0};
const uint16_t FAIL_SEQ[]      = {600, 0};

const uint16_t* buzSeq = nullptr;
uint8_t buzIdx = 0;
unsigned long buzNextAt = 0;

void playSeq(const uint16_t* s) {
  buzSeq = s;
  buzIdx = 0;
  digitalWrite(BUZZER_PIN, HIGH);
  buzNextAt = millis() + s[0];
}

void updateBuzzer() {
  if (!buzSeq || millis() < buzNextAt) return;
  buzIdx++;
  if (buzSeq[buzIdx] == 0) {          // sequence finished
    digitalWrite(BUZZER_PIN, LOW);
    buzSeq = nullptr;
    return;
  }
  digitalWrite(BUZZER_PIN, (buzIdx % 2 == 0) ? HIGH : LOW);
  buzNextAt = millis() + buzSeq[buzIdx];
}

// Short blocking beep, used only for the card-read beep (80 ms)
void quickBeep(unsigned long ms) {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
}

// ================= NON-BLOCKING LED FEEDBACK =
int fbPin = 0;
unsigned long fbUntil = 0;

void showFeedback(int pin, const uint16_t* seq) {
  if (fbPin) digitalWrite(fbPin, LOW);
  fbPin = pin;
  fbUntil = millis() + RESULT_MS;
  digitalWrite(pin, HIGH);
  playSeq(seq);
}

void updateFeedback() {
  if (fbPin && millis() >= fbUntil) {
    digitalWrite(fbPin, LOW);
    fbPin = 0;
  }
}

void allOff() {
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BLUE_LED, LOW);
  fbPin = 0;
}

// ================= HELPERS ===================
// Reads "key":"value" from the server's JSON reply
String jsonField(const String& body, const char* key) {
  String k = String("\"") + key + "\":\"";
  int i = body.indexOf(k);
  if (i < 0) return "";
  i += k.length();
  int j = body.indexOf('"', i);
  return j < 0 ? "" : body.substring(i, j);
}

// Card UID as uppercase hex, e.g. "04A31B2C"
String readUid() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// ================= SERVER CALLS ==============
void reportState(const String& event = "", const String& uid = "", const String& name = "") {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.setTimeout(1500);
  if (!http.begin(String(serverBase) + "/api/device/report")) return;
  http.addHeader("Content-Type", "application/json");
  if (strlen(deviceKey) > 0) http.addHeader("x-device-key", deviceKey);

  String p = "{\"room\":\"" + String(roomCode) + "\",\"power\":\"" + (systemOn ? "on" : "off") + "\"";
  if (event.length()) p += ",\"event\":\"" + event + "\",\"uid\":\"" + uid + "\",\"name\":\"" + name + "\"";
  p += "}";
  http.POST(p);
  http.end();
}

ScanResult sendScan(const String& uid) {
  ScanResult r = { false, "invalid", "" };
  if (WiFi.status() != WL_CONNECTED) { r.event = "offline"; return r; }

  HTTPClient http;
  http.setTimeout(3000);
  if (!http.begin(String(serverBase) + "/api/scan")) { r.event = "offline"; return r; }
  http.addHeader("Content-Type", "application/json");
  if (strlen(deviceKey) > 0) http.addHeader("x-device-key", deviceKey);

  String payload = "{\"uid\":\"" + uid + "\",\"room\":\"" + roomCode + "\"}";
  int code = http.POST(payload);
  String body = code > 0 ? http.getString() : "";
  http.end();

  Serial.printf("Scan HTTP status: %d\n", code);
  Serial.println("Server response: " + body);

  if (code == 201)      { r.ok = true; r.event = "success";   r.name = jsonField(body, "name"); }
  else if (code == 200) { r.event = "duplicate"; r.name = jsonField(body, "name"); }
  else if (code == 404) { r.event = "unknown"; }
  else if (code == 423) { r.event = "closed"; }
  else if (code < 0)    { r.event = "offline"; }
  return r;
}

// ================= BUTTON ====================
void checkButton() {
  bool raw = digitalRead(BUTTON_PIN);
  if (lastButtonRaw == HIGH && raw == LOW && millis() - lastButtonTime > BUTTON_DEBOUNCE) {
    lastButtonTime = millis();
    systemOn = !systemOn;
    blinkOn = true;
    lastBlink = millis();
    if (!systemOn) allOff();
    Serial.println(systemOn ? "SYSTEM ON" : "SYSTEM OFF");
    playSeq(systemOn ? BEEP_ON_SEQ : BEEP_OFF_SEQ);
    reportState();
  }
  lastButtonRaw = raw;
}

// ================= SETUP =====================
void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BLUE_LED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  allOff();
  digitalWrite(BUZZER_PIN, LOW);

  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfid.PCD_Init();
  delay(100);
  Serial.print("RFID firmware: ");
  rfid.PCD_DumpVersionToSerial();

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println();
  Serial.println("WiFi connected, ESP32 IP: " + WiFi.localIP().toString());
  Serial.println("Room: " + String(roomCode));

  reportState();
  Serial.println("Ready. Press the button to turn the system ON.");
}

// ================= LOOP ======================
void loop() {
  checkButton();
  updateBuzzer();
  updateFeedback();

  // Blue LED blink: runs on its own timer, never paused by feedback
  if (millis() - lastBlink >= BLINK_MS) {
    lastBlink = millis();
    blinkOn = !blinkOn;
  }
  digitalWrite(BLUE_LED, (systemOn && blinkOn) ? HIGH : LOW);

  // Retry WiFi every 5 s if it drops
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiTry > 5000) {
    lastWifiTry = millis();
    WiFi.reconnect();
  }

  // Heartbeat: website gets ON/OFF and online status
  if (millis() - lastHeartbeat >= HEARTBEAT_MS) {
    lastHeartbeat = millis();
    reportState();
  }

  // System OFF: ignore cards completely
  if (!systemOn) return;

  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial())  return;

  if (millis() - lastScan < SCAN_COOLDOWN_MS) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  lastScan = millis();

  String uid = readUid();
  Serial.println();
  Serial.println("CARD DETECTED, UID: " + uid);
  quickBeep(80);                         // short beep on every card read

  ScanResult r = sendScan(uid);

  if (r.ok) showFeedback(GREEN_LED, OK_SEQ);     // green + 2 beeps
  else      showFeedback(RED_LED, FAIL_SEQ);     // red + 1 long beep

  reportState(r.event, uid, r.name);

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}