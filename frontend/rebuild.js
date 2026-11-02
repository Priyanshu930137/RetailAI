"use strict";

const API = window.RETAILAI_API_URL || window.location.origin;
const $ = (id) => document.getElementById(id);
const state = { products: [], insights: [], analytics: null, festivals: [], stockouts: [], trendPeriod: "daily", toastTimer: null };
const localeByLanguage = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
const languageCopy = {
  hi: {
    "STORE INTELLIGENCE": "दुकान की जानकारी", "My Market": "मेरा बाज़ार", "Neighbourhood store": "आपकी स्थानीय दुकान", "WORKSPACE": "कार्यक्षेत्र", "Overview": "अवलोकन", "Demand advisor": "मांग सलाहकार", "Inventory": "भंडार", "Sales & imports": "बिक्री और आयात", "Connecting to store data": "दुकान का डेटा जोड़ा जा रहा है", "Checking database…": "डेटाबेस जांच रहे हैं…", "Store database connected": "दुकान का डेटाबेस जुड़ा है", "Changes save automatically": "बदलाव अपने आप सहेजे जाते हैं", "Store database unavailable": "दुकान का डेटाबेस उपलब्ध नहीं है", "Refresh data": "डेटा ताज़ा करें", "YOUR STORE": "आपकी दुकान", "OVERVIEW": "अवलोकन", "MONDAY MORNING, RETAILER": "सुप्रभात, दुकानदार", "Make today’s stock": "आज के स्टॉक को", "work smarter.": "समझदारी से इस्तेमाल करें।", "A clear view of sales, demand, and your next best move.": "बिक्री, मांग और अगले सही कदम की साफ़ जानकारी।", "SALES · 14 DAYS": "बिक्री · 14 दिन", "UNITS SOLD · 14 DAYS": "बिकी इकाइयाँ · 14 दिन", "PRODUCTS TRACKED": "दर्ज उत्पाद", "REPLENISHMENT WATCH": "दोबारा स्टॉक भरें", "Import sales to see revenue": "राजस्व देखने के लिए बिक्री आयात करें", "Across recorded sales": "दर्ज बिक्री का कुल", "Units recorded in your sales history": "बिक्री इतिहास में दर्ज इकाइयाँ", "From saved transactions": "सहेजे गए लेन-देन से", "Products in your store inventory": "आपकी दुकान के भंडार में उत्पाद", "Inventory is database-backed": "भंडार डेटाबेस में सहेजा है", "Products with 3 days or less of cover": "3 दिन या कम चलने वाला स्टॉक", "Review inventory": "भंडार देखें", "FESTIVAL & SEASONAL PULSE": "त्योहार और मौसम की मांग", "Finding the next demand window…": "अगली मांग का समय खोज रहे हैं…", "Calendar signals help you plan earlier.": "त्योहार कैलेंडर से पहले योजना बनाएँ।", "WEATHER-AWARE FORECAST": "मौसम के अनुसार अनुमान", "Local conditions, considered": "स्थानीय मौसम को ध्यान में रखें", "Try heat or rain adjustments in the demand advisor.": "मांग सलाहकार में गर्मी या बारिश जोड़ें।", "SMART STOCK RISK": "स्टॉक का जोखिम", "Waiting for product data": "उत्पाद डेटा की प्रतीक्षा", "Stockout and excess stock risk by product.": "हर उत्पाद में कमी या अधिक स्टॉक का जोखिम।", "PERFORMANCE": "प्रदर्शन", "Sales pulse": "बिक्री का रुझान", "Saved revenue and units by day": "दिन के अनुसार सहेजा राजस्व और इकाइयाँ", "LAST 14 DAYS": "पिछले 14 दिन", "Revenue": "राजस्व", "Units sold": "बिकी इकाइयाँ", "TODAY’S OPPORTUNITY": "आज का अवसर", "Worth a look": "ध्यान देने योग्य", "Recommendations from your store data": "दुकान के डेटा से सुझाव", "Loading your store’s next actions…": "दुकान के लिए अगले कदम देख रहे हैं…", "Open demand advisor": "मांग सलाहकार खोलें", "PLAN WITH CONTEXT": "जानकारी के साथ योजना", "Demand advisor": "मांग सलाहकार", "Combine sales history with calendar and weather signals. See what changed and why.": "बिक्री इतिहास को त्योहार और मौसम के संकेतों से जोड़ें। बदलाव और कारण जानें।", "EXPLAINABLE ESTIMATE": "समझने योग्य अनुमान", "Product": "उत्पाद", "Planning horizon": "योजना अवधि", "Next 7 days": "अगले 7 दिन", "Next 14 days": "अगले 14 दिन", "Next 30 days": "अगले 30 दिन", "Temperature °C": "तापमान °C", "Rainfall mm/day": "बारिश mm/दिन", "optional": "वैकल्पिक", "Build forecast": "मांग का अनुमान बनाएँ", "Building forecast…": "अनुमान बना रहे हैं…", "Your forecast will appear here": "आपका अनुमान यहाँ दिखेगा", "Select a product and build your first forecast.": "उत्पाद चुनें और पहला अनुमान बनाएँ।", "Forecasts are transparent estimates, not guaranteed results. Festival dates are approximate; weather is manually supplied. Add sales history to improve product estimates.": "अनुमान पारदर्शी हैं, पक्की गारंटी नहीं। त्योहार की तारीखें अनुमानित हैं और मौसम हाथ से दर्ज होता है। बिक्री इतिहास जोड़कर अनुमान बेहतर करें।", "STOCK CONTROL": "स्टॉक नियंत्रण", "Monitor coverage, risk, and replenishment suggestions.": "स्टॉक की अवधि, जोखिम और दोबारा ऑर्डर के सुझाव देखें।", "Search inventory": "भंडार खोजें", "Add product": "उत्पाद जोड़ें", "Product name": "उत्पाद का नाम", "On-hand units": "मौजूद इकाइयाँ", "Avg. daily demand": "औसत दैनिक मांग", "Sell price (₹)": "बिक्री मूल्य (₹)", "Unit cost (₹)": "प्रति इकाई लागत (₹)", "Save product": "उत्पाद सहेजें", "Cancel": "रद्द करें", "PRODUCT": "उत्पाद", "ON HAND": "मौजूद", "DAILY DEMAND": "दैनिक मांग", "DAYS OF COVER": "स्टॉक के दिन", "STOCK RISK": "स्टॉक जोखिम", "HIGH RISK": "उच्च जोखिम", "MEDIUM RISK": "मध्यम जोखिम", "LOW RISK": "कम जोखिम", "PRICE / COST": "मूल्य / लागत", "Loading inventory…": "भंडार लोड हो रहा है…", "QUICK ENTRY": "त्वरित प्रविष्टि", "Record a sale": "बिक्री दर्ज करें", "Sales entries immediately update forecasts.": "बिक्री दर्ज होते ही अनुमान अपडेट होगा।", "Sale date": "बिक्री की तारीख", "Units": "इकाइयाँ", "Unit selling price (₹)": "प्रति इकाई बिक्री मूल्य (₹)", "Save sale": "बिक्री सहेजें", "HISTORY IMPORT": "इतिहास आयात", "Bring your sales history": "बिक्री इतिहास जोड़ें", "Upload CSV to get product-level demand forecasts.": "उत्पाद के अनुसार मांग अनुमान के लिए CSV अपलोड करें।", "Choose a sales CSV": "बिक्री CSV चुनें", "Columns: date, product, quantity, price": "कॉलम: date, product, quantity, price", "Download template": "नमूना फ़ाइल डाउनलोड करें", "Import rows": "पंक्तियाँ आयात करें", "Importing…": "आयात हो रहा है…", "RECENT ACTIVITY": "हाल की गतिविधि", "Sales history": "बिक्री इतिहास", "Most recent saved transactions": "हाल में सहेजे गए लेन-देन", "LATEST 12": "नवीनतम 12", "DATE": "तारीख", "UNITS": "इकाइयाँ", "UNIT PRICE": "इकाई मूल्य", "REVENUE": "राजस्व", "No products yet. Add your first product.": "अभी उत्पाद नहीं हैं। पहला उत्पाद जोड़ें।", "No matching products.": "कोई मिलता-जुलता उत्पाद नहीं।", "No sales recorded yet. Add a quick sale or import a CSV.": "अभी बिक्री दर्ज नहीं है। बिक्री दर्ज करें या CSV आयात करें।", "Add products to see store-specific recommendations.": "दुकान के सुझाव देखने के लिए उत्पाद जोड़ें।", "STOCK SCORE": "स्टॉक जोखिम स्कोर", "OVERSTOCK SCORE": "अधिक स्टॉक स्कोर", "EXPECTED DEMAND": "अनुमानित मांग", "STOCKOUT RISK": "स्टॉक खत्म होने का जोखिम", "OVERSTOCK RISK": "अधिक स्टॉक का जोखिम", "REORDER SUGGESTION": "दोबारा ऑर्डर सुझाव", "DEMAND-AWARE PRICE": "मांग के अनुसार मूल्य", "CALENDAR SIGNALS": "त्योहार और मौसम", "WEATHER INPUT": "मौसम जानकारी", "WHY THIS RECOMMENDATION": "इस सुझाव का कारण", "No seasonal uplift": "मौसमी बढ़ोतरी नहीं", "No major festival in this horizon": "इस अवधि में बड़ा त्योहार नहीं", "No local weather adjustment supplied": "स्थानीय मौसम दर्ज नहीं", "No products in inventory": "भंडार में उत्पाद नहीं", "Add products to calculate stock risk.": "स्टॉक जोखिम जानने के लिए उत्पाद जोड़ें।", "Seasonal demand signals are ready": "मौसमी मांग के संकेत तैयार हैं", "Forecast plus safety buffer": "अनुमान और सुरक्षा भंडार", "database": "डेटाबेस", " days cover · ": " दिन का स्टॉक · ", " units suggested": " इकाइयाँ सुझाई गईं", " days left at estimated demand. Order about ": " दिन का स्टॉक शेष। लगभग ", " units.": " इकाइयाँ मंगाएँ।", " confidence": " विश्वास स्तर", " confidence.": " विश्वास स्तर।", " low stockout risk": " स्टॉक खत्म होने का कम जोखिम", " medium stockout risk": " स्टॉक खत्म होने का मध्यम जोखिम", " high stockout risk": " स्टॉक खत्म होने का अधिक जोखिम", "Confidence: ": "विश्वास स्तर: ", " · local estimate": " · स्थानीय अनुमान", "low": "कम", "medium": "मध्यम", "high": "अधिक", "Summer": "गर्मी", "Monsoon": "मानसून", "Festive season": "त्योहारों का मौसम", "Winter": "सर्दी", "Diwali season": "दिवाली का मौसम", "Christmas": "क्रिसमस", "Holi": "होली", "Makar Sankranti": "मकर संक्रांति", "Independence Day": "स्वतंत्रता दिवस", "Festival window: ": "त्योहार अवधि: ", "Season: ": "मौसम: ", "Recent sales average ": "हाल की बिक्री का औसत ", " units/day": " इकाइयाँ/दिन", "Limited sales history; forecast confidence is lower": "बिक्री इतिहास कम है; अनुमान पर भरोसा कम रखें", "No recorded sales yet; using the configured daily-demand estimate": "बिक्री दर्ज नहीं है; निर्धारित दैनिक मांग से अनुमान", "Weather adjustment is a small heuristic from the supplied conditions": "दर्ज मौसम के आधार पर सीमित समायोजन किया गया", "Forecast generated": "मांग अनुमान तैयार", "Product added to inventory.": "उत्पाद भंडार में जोड़ा गया।", "Sale recorded. Forecasts updated from the new history.": "बिक्री दर्ज। अनुमान नए इतिहास के अनुसार अपडेट हुआ।", "Sales history imported and forecasts refreshed.": "बिक्री इतिहास आयात हुआ और अनुमान अपडेट हुए।", "Import rows": "पंक्तियाँ आयात करें", "Select a product first.": "पहले उत्पाद चुनें।", "Add a product before building a forecast.": "अनुमान बनाने से पहले उत्पाद जोड़ें।", "This product has sales history and cannot be deleted": "इस उत्पाद का बिक्री इतिहास है, इसे हटाया नहीं जा सकता।", "Add these products before importing sales: ": "बिक्री आयात करने से पहले ये उत्पाद जोड़ें: ", "No products yet": "अभी उत्पाद नहीं हैं"
  },
  mr: {
    "STORE INTELLIGENCE": "दुकान व्यवस्थापन", "My Market": "माझा बाजार", "Neighbourhood store": "आपले स्थानिक दुकान", "WORKSPACE": "कार्य क्षेत्र", "Overview": "आढावा", "Demand advisor": "मागणी सल्लागार", "Inventory": "साठा", "Sales & imports": "विक्री आणि आयात", "Connecting to store data": "दुकानचा डेटा जोडत आहे", "Checking database…": "डेटाबेस तपासत आहे…", "Store database connected": "दुकानचा डेटाबेस जोडला", "Changes save automatically": "बदल आपोआप जतन होतात", "Store database unavailable": "दुकानचा डेटाबेस उपलब्ध नाही", "Refresh data": "डेटा रिफ्रेश करा", "YOUR STORE": "तुमचे दुकान", "OVERVIEW": "आढावा", "MONDAY MORNING, RETAILER": "शुभ सकाळ, दुकानदार", "Make today’s stock": "आजचा साठा", "work smarter.": "अधिक हुशारीने वापरा.", "A clear view of sales, demand, and your next best move.": "विक्री, मागणी आणि पुढील योग्य कृतीचा स्पष्ट आढावा.", "SALES · 14 DAYS": "विक्री · १४ दिवस", "UNITS SOLD · 14 DAYS": "विकलेल्या वस्तू · १४ दिवस", "PRODUCTS TRACKED": "नोंदवलेली उत्पादने", "REPLENISHMENT WATCH": "पुन्हा साठा भरा", "Import sales to see revenue": "महसूल पाहण्यासाठी विक्री आयात करा", "Across recorded sales": "नोंदवलेल्या विक्रीतून", "Units recorded in your sales history": "विक्री इतिहासातील नोंदवलेल्या वस्तू", "From saved transactions": "जतन केलेल्या व्यवहारांतून", "Products in your store inventory": "दुकानच्या साठ्यातील उत्पादने", "Inventory is database-backed": "साठा डेटाबेसमध्ये जतन आहे", "Products with 3 days or less of cover": "३ दिवस किंवा कमी पुरेल असा साठा", "Review inventory": "साठा तपासा", "FESTIVAL & SEASONAL PULSE": "सण आणि हंगामी मागणी", "Finding the next demand window…": "मागणीचा पुढील काळ शोधत आहे…", "Calendar signals help you plan earlier.": "सणांच्या तारखांनुसार आधी नियोजन करा.", "WEATHER-AWARE FORECAST": "हवामानानुसार अंदाज", "Local conditions, considered": "स्थानिक हवामानाचा विचार", "Try heat or rain adjustments in the demand advisor.": "मागणी सल्लागारात उष्णता किंवा पावसाची माहिती द्या.", "SMART STOCK RISK": "साठ्याचा धोका", "Waiting for product data": "उत्पादनाच्या डेटाची प्रतीक्षा", "Stockout and excess stock risk by product.": "प्रत्येक उत्पादनातील कमी किंवा जादा साठ्याचा धोका.", "PERFORMANCE": "कामगिरी", "Sales pulse": "विक्रीचा कल", "Saved revenue and units by day": "दिवसानुसार जतन केलेला महसूल आणि वस्तू", "LAST 14 DAYS": "मागील १४ दिवस", "Revenue": "महसूल", "Units sold": "विकलेल्या वस्तू", "TODAY’S OPPORTUNITY": "आजची संधी", "Worth a look": "लक्ष देण्यासारखे", "Recommendations from your store data": "दुकानाच्या डेटावर आधारित सूचना", "Loading your store’s next actions…": "दुकानासाठी पुढील कृती शोधत आहे…", "Open demand advisor": "मागणी सल्लागार उघडा", "PLAN WITH CONTEXT": "माहितीच्या आधारे नियोजन", "Combine sales history with calendar and weather signals. See what changed and why.": "विक्री इतिहासासोबत सण आणि हवामानाचे संकेत जोडा. काय बदलले आणि का ते पहा.", "EXPLAINABLE ESTIMATE": "समजण्यास सोपा अंदाज", "Product": "उत्पादन", "Planning horizon": "नियोजन कालावधी", "Next 7 days": "पुढील ७ दिवस", "Next 14 days": "पुढील १४ दिवस", "Next 30 days": "पुढील ३० दिवस", "Temperature °C": "तापमान °C", "Rainfall mm/day": "पाऊस mm/दिवस", "optional": "ऐच्छिक", "Build forecast": "मागणीचा अंदाज तयार करा", "Building forecast…": "अंदाज तयार होत आहे…", "Your forecast will appear here": "तुमचा अंदाज येथे दिसेल", "Select a product and build your first forecast.": "उत्पादन निवडा आणि पहिला अंदाज तयार करा.", "Forecasts are transparent estimates, not guaranteed results. Festival dates are approximate; weather is manually supplied. Add sales history to improve product estimates.": "हे स्पष्ट अंदाज आहेत, हमी नाही. सणांच्या तारखा अंदाजे आहेत आणि हवामान हाताने भरावे लागते. विक्री इतिहास जोडा म्हणजे अंदाज सुधारेल.", "STOCK CONTROL": "साठा नियंत्रण", "Monitor coverage, risk, and replenishment suggestions.": "साठा किती दिवस पुरेल, धोका आणि पुन्हा मागवण्याच्या सूचना पहा.", "Search inventory": "साठा शोधा", "Add product": "उत्पादन जोडा", "Product name": "उत्पादनाचे नाव", "On-hand units": "उपलब्ध वस्तू", "Avg. daily demand": "सरासरी दैनिक मागणी", "Sell price (₹)": "विक्री किंमत (₹)", "Unit cost (₹)": "प्रति वस्तू खर्च (₹)", "Save product": "उत्पादन जतन करा", "Cancel": "रद्द करा", "PRODUCT": "उत्पादन", "ON HAND": "उपलब्ध", "DAILY DEMAND": "दैनिक मागणी", "DAYS OF COVER": "साठा पुरण्याचे दिवस", "STOCK RISK": "साठ्याचा धोका", "PRICE / COST": "किंमत / खर्च", "Loading inventory…": "साठा लोड होत आहे…", "QUICK ENTRY": "जलद नोंद", "Record a sale": "विक्री नोंदवा", "Sales entries immediately update forecasts.": "विक्री नोंदवल्यावर अंदाज लगेच बदलेल.", "Sale date": "विक्रीची तारीख", "Units": "वस्तू", "Unit selling price (₹)": "प्रति वस्तू विक्री किंमत (₹)", "Save sale": "विक्री जतन करा", "HISTORY IMPORT": "इतिहास आयात", "Bring your sales history": "विक्री इतिहास आणा", "Upload CSV to get product-level demand forecasts.": "उत्पादननिहाय मागणीच्या अंदाजासाठी CSV अपलोड करा.", "Choose a sales CSV": "विक्री CSV निवडा", "Columns: date, product, quantity, price": "स्तंभ: date, product, quantity, price", "Download template": "नमुना डाउनलोड करा", "Import rows": "नोंदी आयात करा", "Importing…": "आयात होत आहे…", "RECENT ACTIVITY": "अलीकडील व्यवहार", "Sales history": "विक्री इतिहास", "Most recent saved transactions": "अलीकडे जतन केलेले व्यवहार", "LATEST 12": "अलीकडील १२", "DATE": "तारीख", "UNITS": "वस्तू", "UNIT PRICE": "प्रति वस्तू किंमत", "REVENUE": "महसूल", "No products yet. Add your first product.": "अजून उत्पादने नाहीत. पहिले उत्पादन जोडा.", "No matching products.": "जुळणारी उत्पादने नाहीत.", "No sales recorded yet. Add a quick sale or import a CSV.": "अजून विक्री नोंदवलेली नाही. विक्री नोंदवा किंवा CSV आयात करा.", "Add products to see store-specific recommendations.": "दुकानासाठी सूचना पाहण्यासाठी उत्पादने जोडा.", "STOCK SCORE": "साठा जोखीम गुण", "OVERSTOCK SCORE": "जादा साठा गुण", "EXPECTED DEMAND": "अंदाजित मागणी", "STOCKOUT RISK": "साठा संपण्याचा धोका", "OVERSTOCK RISK": "जादा साठ्याचा धोका", "REORDER SUGGESTION": "पुन्हा मागवण्याची सूचना", "DEMAND-AWARE PRICE": "मागणीनुसार किंमत", "CALENDAR SIGNALS": "सण आणि हंगाम", "WEATHER INPUT": "हवामान माहिती", "WHY THIS RECOMMENDATION": "या सूचनेचे कारण", "No seasonal uplift": "हंगामी वाढ नाही", "No major festival in this horizon": "या कालावधीत मोठा सण नाही", "No local weather adjustment supplied": "स्थानिक हवामान भरलेले नाही", "No products in inventory": "साठ्यात उत्पादने नाहीत", "Add products to calculate stock risk.": "साठ्याचा धोका मोजण्यासाठी उत्पादने जोडा.", "Seasonal demand signals are ready": "हंगामी मागणीचे संकेत तयार आहेत", "Forecast plus safety buffer": "अंदाज आणि सुरक्षित राखीव साठा", " days cover · ": " दिवसांचा साठा · ", " units suggested": " वस्तूंची सूचना", " low stockout risk": " साठा संपण्याचा कमी धोका", " medium stockout risk": " साठा संपण्याचा मध्यम धोका", " high stockout risk": " साठा संपण्याचा जास्त धोका", "Confidence: ": "विश्वास पातळी: ", " · local estimate": " · स्थानिक अंदाज", "low": "कमी", "medium": "मध्यम", "high": "जास्त", "Summer": "उन्हाळा", "Monsoon": "पावसाळा", "Festive season": "सणांचा हंगाम", "Winter": "हिवाळा", "Diwali season": "दिवाळीचा हंगाम", "Christmas": "नाताळ", "Holi": "होळी", "Makar Sankranti": "मकर संक्रांत", "Independence Day": "स्वातंत्र्यदिन", "Festival window: ": "सणाचा कालावधी: ", "Season: ": "हंगाम: ", "Recent sales average ": "अलीकडील विक्रीची सरासरी ", " units/day": " वस्तू/दिवस", "Limited sales history; forecast confidence is lower": "विक्री इतिहास कमी आहे; अंदाजावरील विश्वास कमी", "No recorded sales yet; using the configured daily-demand estimate": "विक्री नोंद नाही; ठरवलेली दैनिक मागणी वापरली आहे", "Weather adjustment is a small heuristic from the supplied conditions": "दिलेल्या हवामानावर मर्यादित समायोजन केले", "Product added to inventory.": "उत्पादन साठ्यात जोडले.", "Sale recorded. Forecasts updated from the new history.": "विक्री नोंदवली. नवीन इतिहासानुसार अंदाज बदलला.", "Sales history imported and forecasts refreshed.": "विक्री इतिहास आयात केला आणि अंदाज अपडेट केले.", "Select a product first.": "आधी उत्पादन निवडा.", "Add a product before building a forecast.": "अंदाजापूर्वी उत्पादन जोडा.", "This product has sales history and cannot be deleted": "या उत्पादनाचा विक्री इतिहास आहे, ते हटवता येणार नाही.", "Add these products before importing sales: ": "विक्री आयात करण्यापूर्वी ही उत्पादने जोडा: "
  }
};
const extraLanguageCopy = {
  hi: {
    "Festival Basket Planner": "त्योहार खरीद योजना", "Turn a local event into a supplier-ready order plan that respects your budget and available space.": "स्थानीय त्योहार के लिए बजट और उपलब्ध जगह के अनुसार खरीद योजना बनाएँ।", "Festival or local event": "त्योहार या स्थानीय आयोजन", "Purchase budget (₹)": "खरीद बजट (₹)", "Extra storage available (units)": "अतिरिक्त उपलब्ध भंडारण (इकाइयाँ)", "Build my basket": "मेरी खरीद सूची बनाएँ", "Your order plan will appear here": "आपकी खरीद योजना यहाँ दिखेगी", "Choose an event, budget, and storage limit.": "आयोजन, बजट और भंडारण सीमा चुनें।", "Recent availability notes": "हाल की स्टॉक अनुपलब्धता", "Stockout days help correct your demand history.": "स्टॉक खत्म होने के दिन मांग इतिहास को सही करने में मदद करते हैं।", "No stockout notes yet.": "अभी स्टॉक खत्म होने की कोई जानकारी नहीं।", "Log stockout": "स्टॉक खत्म दर्ज करें", "Report a stockout": "स्टॉक खत्म होने की जानकारी दें", "Save stockout note": "स्टॉक जानकारी सहेजें", "Unavailable date": "स्टॉक खत्म होने की तारीख", "Estimated lost units": "अनुमानित छूटी बिक्री", "optional": "वैकल्पिक", "Availability notes": "उपलब्धता की जानकारी",
    "OPTIONAL WEATHER INPUT": "वैकल्पिक मौसम जानकारी", "Adjust a forecast for local conditions": "स्थानीय परिस्थितियों के लिए अनुमान बदलें", "Add temperature or rainfall in the demand advisor.": "मांग सलाहकार में तापमान या बारिश जोड़ें।", "Missing products are added automatically. New items start at 0 stock; estimated cost is editable in inventory.": "छूटे उत्पाद अपने आप जुड़ेंगे। नए उत्पाद 0 स्टॉक से शुरू होंगे; अनुमानित लागत भंडार में बदलें।", "INVENTORY EDITOR": "भंडार संपादक", "Save changes": "बदलाव सहेजें", "Cancel": "रद्द करें", "On-hand units": "मौजूद इकाइयाँ", "Average daily demand": "औसत दैनिक मांग", "Supplier lead time (days)": "आपूर्ति समय (दिन)", "Holding cost / unit / day (₹)": "भंडारण लागत / इकाई / दिन (₹)", "Selling price (₹)": "बिक्री मूल्य (₹)", "Unit cost (₹)": "इकाई लागत (₹)",
    "Sales intelligence": "बिक्री जानकारी", "SALES INTELLIGENCE": "बिक्री जानकारी", "Daily & monthly sales trends": "दैनिक और मासिक बिक्री रुझान", "Compare recorded units and revenue across time.": "समय के साथ दर्ज बिक्री और राजस्व की तुलना करें।", "Daily · 30 days": "दैनिक · 30 दिन", "Monthly · 12 months": "मासिक · 12 महीने", "TOP PERFORMERS · 90 DAYS": "शीर्ष उत्पाद · 90 दिन", "Best-selling products": "सबसे अधिक बिकने वाले उत्पाद", "Ranked by units sold, with revenue shown.": "बिकी इकाइयों के आधार पर क्रम, साथ में राजस्व।", "NEEDS ATTENTION · 90 DAYS": "ध्यान दें · 90 दिन", "Lowest-selling products": "सबसे कम बिकने वाले उत्पाद", "Includes items with no recorded sales.": "बिना बिक्री वाले उत्पाद भी शामिल हैं।", "PLAN AHEAD": "पहले से योजना बनाएँ", "Upcoming festival insights": "आगामी त्योहार जानकारी", "Check supplier lead time and place orders before demand windows.": "आपूर्तिकर्ता समय देखें और मांग बढ़ने से पहले ऑर्डर दें।", "NEXT 120 DAYS": "अगले 120 दिन", "Supplier lead time (days)": "आपूर्ति समय (दिन)", "Holding cost / unit / day (₹)": "भंडारण लागत / इकाई / दिन (₹)", "LEAD TIME": "आपूर्ति समय", "HOLDING COST / DAY": "दैनिक भंडारण लागत", "SUPPLIER & HOLDING COST": "आपूर्ति और भंडारण लागत", "current carrying cost": "मौजूदा भंडारण लागत", "excess holding cost over horizon": "अवधि की अतिरिक्त भंडारण लागत", "Edit plan": "योजना बदलें", "No listed festival windows in the next 120 days.": "अगले 120 दिनों में त्योहार सूचीबद्ध नहीं हैं।", "No products in inventory yet.": "भंडार में अभी उत्पाद नहीं हैं।", "Check suppliers now": "आपूर्तिकर्ता से अभी संपर्क करें", "Review purchase by ": "इस तारीख तक खरीद देखें ", "days away": "दिन बाकी", "units": "इकाइयाँ", "days": "दिन", "units/day": "इकाइयाँ/दिन"
  },
  mr: {
    "Festival Basket Planner": "सण खरेदी नियोजक", "Turn a local event into a supplier-ready order plan that respects your budget and available space.": "स्थानिक सणासाठी बजेट आणि उपलब्ध जागेनुसार खरेदी योजना तयार करा.", "Festival or local event": "सण किंवा स्थानिक कार्यक्रम", "Purchase budget (₹)": "खरेदीचे बजेट (₹)", "Extra storage available (units)": "अतिरिक्त उपलब्ध साठवण (युनिट)", "Build my basket": "माझी खरेदी सूची तयार करा", "Your order plan will appear here": "तुमची खरेदी योजना येथे दिसेल", "Choose an event, budget, and storage limit.": "कार्यक्रम, बजेट आणि साठवण मर्यादा निवडा.", "Recent availability notes": "अलीकडील साठा नोंदी", "Stockout days help correct your demand history.": "साठा नसलेले दिवस मागणीचा इतिहास सुधारण्यास मदत करतात.", "No stockout notes yet.": "साठा नसल्याची नोंद नाही.", "Log stockout": "साठा संपल्याची नोंद", "Report a stockout": "साठा संपल्याची माहिती द्या", "Save stockout note": "साठ्याची नोंद जतन करा", "Unavailable date": "साठा संपल्याची तारीख", "Estimated lost units": "अंदाजे गमावलेली विक्री", "optional": "ऐच्छिक", "Availability notes": "साठ्याच्या नोंदी",
    "OPTIONAL WEATHER INPUT": "पर्यायी हवामान माहिती", "Adjust a forecast for local conditions": "स्थानिक परिस्थितीनुसार अंदाज बदला", "Add temperature or rainfall in the demand advisor.": "मागणी सल्लागारात तापमान किंवा पाऊस जोडा.", "Missing products are added automatically. New items start at 0 stock; estimated cost is editable in inventory.": "नसलेली उत्पादने आपोआप जोडली जातील. नवीन उत्पादने 0 साठ्याने सुरू होतील; अंदाजे किंमत साठ्यात बदलता येईल.", "INVENTORY EDITOR": "साठा संपादक", "Save changes": "बदल जतन करा", "Cancel": "रद्द करा", "On-hand units": "हातातील युनिट", "Average daily demand": "सरासरी दैनंदिन मागणी", "Supplier lead time (days)": "पुरवठा वेळ (दिवस)", "Holding cost / unit / day (₹)": "साठवण खर्च / युनिट / दिवस (₹)", "Selling price (₹)": "विक्री किंमत (₹)", "Unit cost (₹)": "प्रति युनिट खर्च (₹)",
    "Sales intelligence": "विक्री माहिती", "SALES INTELLIGENCE": "विक्री माहिती", "Daily & monthly sales trends": "दैनिक आणि मासिक विक्रीचा कल", "Compare recorded units and revenue across time.": "वेगवेगळ्या कालावधीतील नोंदवलेली विक्री आणि महसूल तुलना करा.", "Daily · 30 days": "दैनिक · ३० दिवस", "Monthly · 12 months": "मासिक · १२ महिने", "TOP PERFORMERS · 90 DAYS": "सर्वाधिक विक्री · ९० दिवस", "Best-selling products": "सर्वाधिक विकली जाणारी उत्पादने", "Ranked by units sold, with revenue shown.": "विकलेल्या वस्तूंनुसार क्रम आणि महसूल.", "NEEDS ATTENTION · 90 DAYS": "लक्ष द्या · ९० दिवस", "Lowest-selling products": "सर्वात कमी विकली जाणारी उत्पादने", "Includes items with no recorded sales.": "विक्री नोंद नसलेली उत्पादनेही समाविष्ट.", "PLAN AHEAD": "आधी नियोजन करा", "Upcoming festival insights": "आगामी सणांची माहिती", "Check supplier lead time and place orders before demand windows.": "पुरवठ्याचा कालावधी तपासा आणि मागणी वाढण्यापूर्वी ऑर्डर द्या.", "NEXT 120 DAYS": "पुढील १२० दिवस", "Supplier lead time (days)": "पुरवठ्याचा कालावधी (दिवस)", "Holding cost / unit / day (₹)": "साठवण खर्च / वस्तू / दिवस (₹)", "LEAD TIME": "पुरवठा कालावधी", "HOLDING COST / DAY": "दैनिक साठवण खर्च", "SUPPLIER & HOLDING COST": "पुरवठा आणि साठवण खर्च", "current carrying cost": "सध्याचा साठवण खर्च", "excess holding cost over horizon": "कालावधीतील अतिरिक्त साठवण खर्च", "Edit plan": "योजना बदला", "No listed festival windows in the next 120 days.": "पुढील १२० दिवसांत सण नोंदलेले नाहीत.", "No products in inventory yet.": "साठ्यात अजून उत्पादने नाहीत.", "Check suppliers now": "पुरवठादाराशी आता संपर्क करा", "Review purchase by ": "या तारखेपर्यंत खरेदी तपासा ", "days away": "दिवस बाकी", "units": "वस्तू", "days": "दिवस", "units/day": "वस्तू/दिवस"
  }
};
let currentLanguage = localStorage.getItem("retailai-language") || "en";
if (!languageCopy[currentLanguage] && currentLanguage !== "en") currentLanguage = "en";
const locale = () => localeByLanguage[currentLanguage] || localeByLanguage.en;
const translateText = (text) => {
  const copy = { ...(languageCopy[currentLanguage] || {}), ...(extraLanguageCopy[currentLanguage] || {}) };
  return Object.keys(copy).sort((a, b) => b.length - a.length).reduce((value, phrase) => {
    if (/^[a-z]+$/i.test(phrase)) return value.replace(new RegExp(`\\b${phrase}\\b`, "g"), copy[phrase]);
    return value.replaceAll(phrase, copy[phrase]);
  }, text);
};
function applyLanguage(language = currentLanguage) {
  currentLanguage = language;
  document.documentElement.lang = language;
  document.title = language === "hi" ? "RetailAI — दुकान की जानकारी" : language === "mr" ? "RetailAI — दुकान व्यवस्थापन" : "RetailAI — Store intelligence";
  try { localStorage.setItem("retailai-language", language); } catch (_) { /* storage may be unavailable */ }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    node.nodeValue = translateText(originalText.get(node));
  }
  for (const node of document.querySelectorAll("[placeholder], [aria-label], [title]")) {
    if (!originalAttributes.has(node)) originalAttributes.set(node, {});
    const originals = originalAttributes.get(node);
    for (const attr of ["placeholder", "aria-label", "title"]) {
      if (node.hasAttribute(attr) && !(attr in originals)) originals[attr] = node.getAttribute(attr);
      if (attr in originals) node.setAttribute(attr, translateText(originals[attr]));
    }
  }
}
const money = (value) => new Intl.NumberFormat(locale(), { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
const fmt = (value) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(Number(value || 0));

async function api(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data;
}

function toast(message, error = false) {
  const box = $("toast");
  box.textContent = translateText(message);
  box.classList.toggle("toast-error", error);
  box.classList.add("show");
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => box.classList.remove("show"), 3200);
}

function showInlineMessage(id, message, error = false) {
  const notice = $(id);
  notice.textContent = translateText(message);
  notice.classList.toggle("error", error);
  notice.classList.toggle("success", !error && Boolean(message));
}

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) {
    const text = document.createTextNode(String(value));
    originalText.set(text, String(value));
    text.nodeValue = translateText(String(value));
    node.append(text);
  }
  return node;
}

function setConnection(ok, message = "") {
  $("connectionDot").classList.toggle("online", ok);
  $("connectionTitle").textContent = ok ? "Store database connected" : "Store database unavailable";
  $("connectionDetail").textContent = ok ? "Changes save automatically" : message || "Start RetailAI using the README steps";
}

function renderMetrics(data) {
  $("metricRevenue").textContent = money(data.revenue_14d);
  $("metricUnits").textContent = fmt(data.units_14d);
  $("metricProducts").textContent = fmt(data.product_count);
  $("metricLowStock").textContent = fmt(data.low_stock_count);
  $("metricRevenueNote").textContent = data.units_14d ? "Across recorded sales" : "Import sales to see revenue";

  const bars = $("revenueBars");
  bars.replaceChildren();
  const values = data.sales_by_day.map((row) => row.revenue);
  const max = Math.max(1, ...values);
  for (let i = 0; i < 9; i++) {
    const bar = element("i");
    const value = values[Math.floor(i * values.length / 9)] || 0;
    bar.style.height = `${Math.max(10, value / max * 100)}%`;
    bars.append(bar);
  }

  const chart = $("salesChart");
  chart.replaceChildren();
  const daily = new Map(data.sales_by_day.map((row) => [row.date, row]));
  const today = new Date();
  const series = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (13 - i));
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return { day, ...(daily.get(key) || { revenue: 0, units: 0 }) };
  });
  const maxRevenue = Math.max(1, ...series.map((row) => row.revenue));
  const maxUnits = Math.max(1, ...series.map((row) => row.units));
  for (const row of series) {
    const pair = element("div", "chart-day");
    pair.dataset.day = row.day.toLocaleDateString("en-IN", { day: "numeric" });
    const revenue = element("i", "bar");
    const units = element("i", "bar units");
    revenue.style.height = `${Math.max(row.revenue ? 4 : 1, row.revenue / maxRevenue * 94)}%`;
    units.style.height = `${Math.max(row.units ? 4 : 1, row.units / maxUnits * 70)}%`;
    revenue.title = `${row.day.toLocaleDateString()}: ${money(row.revenue)}`;
    units.title = `${fmt(row.units)} units`;
    pair.append(revenue, units);
    chart.append(pair);
  }
  applyLanguage();
}

function riskFor(product) {
  const days = product.stock / Math.max(product.daily_demand, 0.1);
  const lead = Number(product.supplier_lead_time_days ?? 3);
  return { days, level: days < lead ? "high" : days < lead + 4 ? "medium" : "low" };
}

function riskLabel(level) {
  const labels = {
    hi: { high: "उच्च जोखिम", medium: "मध्यम जोखिम", low: "कम जोखिम" },
    mr: { high: "जास्त धोका", medium: "मध्यम धोका", low: "कमी धोका" }
  };
  return labels[currentLanguage]?.[level] || `${level.toUpperCase()} RISK`;
}

function fillProductSelects() {
  for (const id of ["forecastProduct", "saleProduct"]) {
    const select = $(id);
    const old = select.value;
    select.replaceChildren();
    for (const product of state.products) {
      const option = element("option", "", product.name.trim());
      option.value = String(product.id);
      select.append(option);
    }
    if (state.products.some((product) => String(product.id) === old)) select.value = old;
  }
  const selected = state.products.find((product) => String(product.id) === $("saleProduct").value);
  if (selected) $("salePrice").value = selected.selling_price;
}

function renderProducts() {
  const rows = $("productRows");
  rows.replaceChildren();
  const query = $("inventorySearch").value.trim().toLocaleLowerCase();
  const products = state.products.filter((product) => product.name.toLocaleLowerCase().includes(query));
  if (!products.length) {
    const row = element("tr");
    const cell = element("td", "empty-state", query ? "No matching products." : "No products yet. Add your first product.");
    cell.colSpan = 9;
    row.append(cell);
    rows.append(row);
    return;
  }
  for (const product of products) {
    const risk = riskFor(product);
    const row = element("tr");
    const name = element("td", "product-name", product.name.trim());
    name.append(element("small", "subcell", `ID ${product.id}`));
    const stock = element("td", "", fmt(product.stock));
    const demand = element("td", "", `${fmt(product.daily_demand)} units`);
    const cover = element("td", "", `${fmt(risk.days)} days`);
    const lead = element("td", "", `${fmt(product.supplier_lead_time_days ?? 3)} days`);
    const holding = element("td", "", `${money(product.holding_cost_per_unit_day ?? 0.5)} / unit / day`);
    const status = element("td");
    status.append(element("span", `risk-pill risk-${risk.level === "high" ? "high" : risk.level === "medium" ? "med" : "low"}`, riskLabel(risk.level)));
    const price = element("td", "", `${money(product.selling_price)} / ${money(product.unit_cost)}`);
    const actions = element("td");
    const actionWrap = element("div", "row-actions");
    const edit = element("button", "", "Edit plan");
    edit.type = "button";
    edit.addEventListener("click", () => editProduct(product));
    const report = element("button", "", "Log stockout");
    report.type = "button";
    report.addEventListener("click", () => openStockoutDialog(product));
    const remove = element("button", "delete-action", "Delete");
    remove.type = "button";
    remove.addEventListener("click", () => deleteProduct(product));
    actionWrap.append(edit, report, remove);
    actions.append(actionWrap);
    row.append(name, stock, demand, cover, lead, holding, status, price, actions);
    rows.append(row);
  }
  applyLanguage();
}

function renderSalesAnalytics() {
  if (!state.analytics) return;
  const chart = $("trendChart");
  chart.replaceChildren();
  const source = state.trendPeriod === "daily" ? state.analytics.daily : state.analytics.monthly;
  const byPeriod = new Map(source.map((row) => [row.period, row]));
  let rows;
  if (state.trendPeriod === "daily") {
    const today = new Date();
    rows = Array.from({ length: 30 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (29 - index));
      const period = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      return { period, label: day.toLocaleDateString(locale(), { day: "numeric" }), ...(byPeriod.get(period) || { units: 0, revenue: 0 }) };
    });
  } else {
    const now = new Date();
    rows = Array.from({ length: 12 }, (_, index) => {
      const day = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      const period = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}`;
      return { period, label: day.toLocaleDateString(locale(), { month: "short" }), ...(byPeriod.get(period) || { units: 0, revenue: 0 }) };
    });
  }
  const maxRevenue = Math.max(1, ...rows.map((row) => row.revenue));
  const maxUnits = Math.max(1, ...rows.map((row) => row.units));
  rows.forEach((row) => {
    const column = element("div", "trend-column");
    column.dataset.label = row.label;
    const revenue = element("i");
    const units = element("i", "units-trend");
    revenue.style.height = `${Math.max(row.revenue ? 3 : 1, row.revenue / maxRevenue * 95)}%`;
    units.style.height = `${Math.max(row.units ? 3 : 1, row.units / maxUnits * 72)}%`;
    revenue.title = `${row.period}: ${money(row.revenue)}`;
    units.title = `${fmt(row.units)} units`;
    column.append(revenue, units);
    chart.append(column);
  });
  $("dailyTrendBtn").classList.toggle("active", state.trendPeriod === "daily");
  $("monthlyTrendBtn").classList.toggle("active", state.trendPeriod === "monthly");
  applyLanguage();
}

function renderRankings() {
  if (!state.analytics) return;
  for (const [id, rows] of [["bestSellers", state.analytics.best_sellers_90d], ["lowestSellers", state.analytics.lowest_sellers_90d]]) {
    const list = $(id);
    list.replaceChildren();
    if (!rows.length) {
      list.append(element("div", "empty-state", "No products in inventory yet."));
      continue;
    }
    const maxUnits = Math.max(1, ...rows.map((row) => row.units));
    rows.forEach((row, index) => {
      const item = element("div", "rank-row");
      const name = element("div", "rank-name", row.product);
      const bar = element("div", "rank-bar");
      const fill = element("i");
      fill.style.width = `${row.units / maxUnits * 100}%`;
      bar.append(fill);
      name.append(bar);
      item.append(element("span", "rank-number", String(index + 1)), name);
      const meta = element("div", "rank-meta");
      meta.append(element("b", "", `${fmt(row.units)} units`), element("small", "", money(row.revenue)));
      item.append(meta);
      list.append(item);
    });
  }
  applyLanguage();
}

function renderFestivalInsights() {
  const list = $("festivalList");
  list.replaceChildren();
  if (!state.festivals.length) {
    list.append(element("div", "empty-state", "No listed festival windows in the next 120 days."));
    return;
  }
  const longestLead = Math.max(0, ...state.products.map((product) => Number(product.supplier_lead_time_days || 0)));
  for (const event of state.festivals.slice(0, 6)) {
    const card = element("article", "festival-item");
    const orderBy = Math.max(0, event.days_until - longestLead);
    const advice = `${event.days_until} days away · plan orders at least ${longestLead} days ahead · ${event.expected_uplift_percent}% illustrative uplift`;
    card.append(element("b", "", event.name), element("small", "", `${event.date} · ${advice}`), element("span", "", orderBy === 0 ? "Check suppliers now" : `Review purchase by ${new Date(Date.now() + orderBy * 86400000).toLocaleDateString(locale(), { day: "numeric", month: "short" })}`));
    list.append(card);
  }
  applyLanguage();
}

function renderStockoutHistory() {
  const list = $("stockoutHistory");
  list.replaceChildren();
  if (!state.stockouts.length) {
    list.append(element("span", "empty-state", "No stockout notes yet."));
    return;
  }
  for (const event of state.stockouts.slice(0, 5)) {
    const row = element("div", "stockout-history-row");
    const summary = event.estimated_lost_units === null
      ? "Constrained day excluded from training"
      : `About ${fmt(event.estimated_lost_units)} lost units added to demand`;
    row.append(element("b", "", `${event.product} · ${event.date}`), element("small", "", event.note ? `${summary} · ${event.note}` : summary));
    list.append(row);
  }
}

function renderFestivalPlan(data) {
  const output = $("festivalPlanOutput");
  output.replaceChildren();
  const summary = element("div", "planner-summary");
  const tiles = [
    ["BUDGET USED", money(data.budget_used_inr), `${money(data.budget_left_inr)} left`],
    ["STORAGE USED", `${fmt(data.storage_used_units)} units`, `of ${fmt(data.storage_capacity_units)} available`],
    ["ORDER LINES", String(data.ordered_product_count), `${data.days_until} days to ${data.festival_name}`],
    ["FORECAST SOURCE", data.model_source === "RandomForestRegressor" ? "Store ML" : "Seasonal", data.stockout_days_adjusted ? `${data.stockout_days_adjusted} stockout days corrected` : "Store history + calendar"]
  ];
  for (const [label, value, note] of tiles) {
    const tile = element("div", "planner-stat");
    tile.append(element("span", "", label), element("b", "", value), element("small", "", note));
    summary.append(tile);
  }
  output.append(summary);
  if (!data.items.length) {
    output.append(element("div", "planner-empty", "Current stock is projected to cover the event window, or the budget/storage limits leave no purchase capacity."));
  } else {
    const list = element("div", "planner-order-list");
    for (const item of data.items) {
      const row = element("article", "planner-order-row");
      const name = element("div", "planner-order-name");
      name.append(element("b", "", item.product), element("small", "", `${fmt(item.event_demand_units)} expected event units · ${item.expected_uplift_percent > 0 ? "+" : ""}${item.expected_uplift_percent}% · ${item.uplift_source} · ${item.cost_source}`));
      const quantity = element("strong", "", `${fmt(item.order_units)} units`);
      const cost = element("div", "planner-order-cost");
      cost.append(element("b", "", money(item.order_cost)), element("small", "", `Buy by ${item.buy_by}`));
      row.append(name, quantity, cost);
      if (item.unfunded_units) row.append(element("small", "planner-shortfall", `${fmt(item.unfunded_units)} units could not fit the budget or storage limit`));
      list.append(row);
    }
    output.append(list);
  }
  output.append(element("p", "method-note", data.note));
  applyLanguage();
}

function setFestivalPlanDefaults() {
  const first = state.festivals[0];
  const eventName = $("planFestivalName"), eventDate = $("planFestivalDate");
  const today = new Date();
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 120);
  eventDate.min = today.toLocaleDateString("en-CA");
  eventDate.max = maxDate.toLocaleDateString("en-CA");
  if (first && !eventName.value && !eventDate.value) {
    eventName.value = first.name;
    eventDate.value = first.date;
  }
}

function openStockoutDialog(product) {
  const form = $("stockoutForm");
  form.elements.product_id.value = product.id;
  form.elements.stockout_date.value = new Date().toLocaleDateString("en-CA");
  form.elements.estimated_lost_units.value = "";
  form.elements.note.value = "";
  $("stockoutTitle").textContent = `Report ${product.name.trim()} unavailable`;
  showInlineMessage("stockoutMessage", "");
  $("stockoutDialog").showModal();
}

function renderInsights() {
  const ranked = [...state.insights].sort((a, b) => b.stock_risk.score - a.stock_risk.score);
  const highest = ranked[0];
  if (highest) {
    $("riskPulse").textContent = `${highest.product}: ${highest.stock_risk.level} stockout risk`;
    $("riskPulseNote").textContent = `${fmt(highest.stock_risk.days_of_cover)} days cover · ${fmt(highest.recommended_replenishment)} units suggested`;
  } else {
    $("riskPulse").textContent = "No products in inventory";
    $("riskPulseNote").textContent = "Add products to calculate stock risk.";
  }
  const event = state.insights.flatMap((item) => item.festival_events || [])[0];
  const season = state.insights.flatMap((item) => item.seasonal_context || [])[0];
  $("festivalPulse").textContent = event || season || "Seasonal demand signals are ready";

  const actions = $("actionList");
  actions.replaceChildren();
  const suggestions = ranked.slice(0, 3).map((item) => ({
    title: `${item.product} · ${item.stock_risk.level} stockout risk`,
    note: `${fmt(item.stock_risk.days_of_cover)} days left at estimated demand. Order about ${fmt(item.recommended_replenishment)} units.`,
    label: `STOCK SCORE ${item.stock_risk.score}/100`
  }));
  const excess = [...state.insights].sort((a, b) => b.overstock_risk.score - a.overstock_risk.score)[0];
  if (excess?.overstock_risk.score >= 20) suggestions.push({
    title: `${excess.product} · excess stock to review`,
    note: `${fmt(excess.overstock_risk.excess_units)} units above the forecast target. Consider a promotion before reordering.`,
    label: `OVERSTOCK SCORE ${excess.overstock_risk.score}/100`
  });
  if (!suggestions.length) actions.append(element("div", "empty-state", "Add products to see store-specific recommendations."));
  for (const suggestion of suggestions.slice(0, 3)) {
    const item = element("div", "action-item");
    item.append(element("b", "", suggestion.title), element("small", "", suggestion.note), element("span", "action-tag", suggestion.label));
    actions.append(item);
  }
  applyLanguage();
}

async function buildForecast(event) {
  event?.preventDefault();
  const id = $("forecastProduct").value;
  if (!id) return toast("Add a product before building a forecast.", true);
  const params = new URLSearchParams({ days: $("forecastDays").value });
  if ($("temperature").value !== "") params.set("temperature_c", $("temperature").value);
  if ($("rain").value !== "") params.set("rain_mm", $("rain").value);
  const button = $("forecastForm").querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Building forecast…";
  try {
    const data = await api(`/api/forecast/${id}?${params}`);
    renderForecast(data);
  } catch (error) {
    toast(error.message, true);
  } finally {
    button.disabled = false;
    button.innerHTML = "Build forecast <span>→</span>";
    applyLanguage();
  }
}

function renderForecast(data) {
  const output = $("forecastOutput");
  output.dataset.loaded = "true";
  output.replaceChildren();
  const grid = element("div", "forecast-result");
  const metrics = [
    ["EXPECTED DEMAND", `${fmt(data.total_demand)} units`, `${fmt(data.daily_average)} per day`],
    ["STOCKOUT RISK", `${data.stock_risk.score}/100`, `${data.stock_risk.level} · ${fmt(data.stock_risk.days_of_cover)} days cover`],
    ["OVERSTOCK RISK", `${data.overstock_risk.score}/100`, `${fmt(data.overstock_risk.excess_units)} excess units`],
    ["REORDER SUGGESTION", `${fmt(data.recommended_replenishment)} units`, "Forecast plus safety buffer"]
  ];
  for (const [label, value, note] of metrics) {
    const card = element("div", "forecast-kpi");
    card.append(element("span", "", label), element("b", "", value), element("small", "", note));
    grid.append(card);
  }
  const price = element("div", "forecast-kpi");
  price.append(element("span", "", "DEMAND-AWARE PRICE"), element("b", "", money(data.pricing.suggested_price)), element("small", "", `${data.pricing.gross_margin}% gross margin · current ${money(data.pricing.current_price)}`));
  grid.append(price);
  const seasonal = (data.seasonal_context || []).join(", ") || "No seasonal uplift";
  const festivals = (data.festival_events || []).join(", ") || "No major festival in this horizon";
  const weather = data.weather.temperature_c === null && data.weather.rain_mm === null
    ? "No local weather adjustment supplied"
    : `${data.weather.temperature_c ?? "—"}°C · ${data.weather.rain_mm ?? "—"} mm rain · factor ${data.weather.adjustment}`;
  const explanation = (data.explanation || []).join(". ") || data.method;
  const evaluation = data.model?.evaluation;
  const modelSummary = evaluation
    ? `Holdout MAE ${evaluation.mae} units/day vs mean-baseline MAE ${evaluation.baseline_mae}; RMSE ${evaluation.rmse}${evaluation.wape_percent === null ? "" : `; WAPE ${evaluation.wape_percent}%`}.`
    : (data.model?.reason || "Model evaluation needs more recorded sales history.");
  const drivers = (data.model?.feature_importance || []).slice(0, 4)
    .map((item) => `${item.feature} (${Math.round(item.importance * 100)}%)`).join(", ") || "No trained-model feature ranking yet";
  const detailList = [
    ["CALENDAR SIGNALS", `${seasonal}. ${festivals}`],
    ["WEATHER INPUT", weather],
    ["SUPPLIER & HOLDING COST", `${fmt(data.supplier_lead_time_days)} day supplier lead · ${money(data.holding_cost.per_unit_per_day)} per unit/day · current carrying cost ${money(data.holding_cost.current_inventory_per_day)}/day · excess holding cost over horizon ${money(data.holding_cost.estimated_excess_cost_over_horizon)}`],
    ["MODEL EVALUATION", `${modelSummary} Leading features: ${drivers}.`],
    ["WHY THIS RECOMMENDATION", `${explanation}. ${data.method}. Confidence: ${data.confidence}.`]
  ];
  const details = element("div", "forecast-details");
  for (const [title, text] of detailList) {
    const box = element("div", "detail-box");
    box.append(element("b", "", title), element("p", "", text));
    details.append(box);
  }
  grid.append(details);
  const bars = element("div", "forecast-bars");
  const max = Math.max(1, ...data.forecast.map((point) => point.units));
  for (const point of data.forecast) {
    const bar = element("i");
    bar.style.height = `${Math.max(8, point.units / max * 100)}%`;
    bar.title = `${point.date}: ${fmt(point.units)} units`;
    bars.append(bar);
  }
  grid.append(bars);
  output.append(grid);
  applyLanguage();
}

async function refresh() {
  $("refreshBtn").classList.add("spinning");
  try {
    const [health, dashboard, insights, sales, analytics, festivals, stockouts] = await Promise.all([
      api("/api/health"), api("/api/dashboard"), api("/api/insights"), api("/api/sales?limit=12"), api("/api/analytics"), api("/api/festivals?days=120"), api("/api/stockouts?limit=20")
    ]);
    setConnection(true);
    state.products = dashboard.products;
    state.insights = insights.insights;
    state.analytics = analytics;
    state.festivals = festivals.events;
    state.stockouts = stockouts.events;
    setFestivalPlanDefaults();
    latestDashboard = dashboard;
    renderMetrics(dashboard);
    renderProducts();
    fillProductSelects();
    renderInsights();
    renderSales(sales);
    renderSalesAnalytics();
    renderRankings();
    renderFestivalInsights();
    renderStockoutHistory();
    if (state.products.length) await buildForecast();
    void health;
  } catch (error) {
    setConnection(false, error.message);
    $("actionList").replaceChildren(element("div", "empty-state", error.message));
    toast(`Could not load store data: ${error.message}`, true);
    applyLanguage();
  } finally {
    $("refreshBtn").classList.remove("spinning");
  }
}

function renderSales(sales) {
  latestSales = sales;
  const body = $("salesRows");
  body.replaceChildren();
  if (!sales.length) {
    const row = element("tr");
    const cell = element("td", "empty-state", "No sales recorded yet. Add a quick sale or import a CSV.");
    cell.colSpan = 5;
    row.append(cell);
    body.append(row);
    return;
  }
  for (const sale of sales) {
    const row = element("tr");
    row.append(
      element("td", "", new Date(`${sale.sale_date}T12:00:00`).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" })),
      element("td", "product-name", sale.product_name),
      element("td", "", fmt(sale.quantity)),
      element("td", "", money(sale.price)),
      element("td", "", money(sale.price * sale.quantity))
    );
    body.append(row);
  }
  applyLanguage();
}

function editProduct(product) {
  const form = $("productEditForm");
  for (const key of ["stock", "daily_demand", "supplier_lead_time_days", "holding_cost_per_unit_day", "selling_price", "unit_cost"]) {
    form.elements[key].value = product[key] ?? 0;
  }
  form.dataset.productId = String(product.id);
  $("productEditTitle").textContent = `Edit ${product.name.trim()}`;
  showInlineMessage("productEditMessage", "");
  $("productEditDialog").showModal();
}

async function deleteProduct(product) {
  if (!window.confirm(`Delete ${product.name}? Products with sales history cannot be deleted.`)) return;
  try {
    await api(`/api/products/${product.id}`, { method: "DELETE" });
    showInlineMessage("inventoryMessage", `${product.name.trim()} removed from inventory.`);
    toast(`${product.name} deleted.`);
    await refresh();
  } catch (error) { showInlineMessage("inventoryMessage", error.message, true); toast(error.message, true); }
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("The CSV has an unfinished quoted value.");
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  if (!rows.length) throw new Error("The CSV is empty.");
  const aliases = { sale_date: "date", product_name: "product", item: "product", qty: "quantity", unit_price: "price", selling_price: "price" };
  const headers = rows.shift().map((header) => {
    const normalized = header.trim().toLocaleLowerCase().replace(/^\ufeff/, "").replace(/[\s-]+/g, "_");
    return aliases[normalized] || normalized;
  });
  if (!rows.length) throw new Error("The CSV has headers but no sales rows.");
  if (new Set(headers).size !== headers.length) throw new Error("The CSV has duplicate column names.");
  for (const required of ["date", "product", "quantity", "price"]) if (!headers.includes(required)) throw new Error(`CSV needs a '${required}' column.`);
  if (rows.length > 5000) throw new Error("Import up to 5,000 rows at a time.");
  return rows.map((values, index) => {
    const item = Object.fromEntries(headers.map((header, column) => [header, values[column] || ""]));
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(item.date) ? new Date(`${item.date}T00:00:00Z`) : new Date(NaN);
    const quantity = Number(item.quantity), price = Number(item.price);
    if (!item.product || Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== item.date || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid date, product, quantity, or price on CSV row ${index + 2}.`);
    }
    return { sale_date: item.date, product_name: item.product.trim(), quantity, price };
  });
}

let pendingCsv = [];

async function importCsv() {
  if (!pendingCsv.length) return;
  const button = $("uploadCsvBtn");
  button.disabled = true;
  button.textContent = "Importing…";
  showInlineMessage("importMessage", "Importing sales and checking product names…");
  try {
    const result = await api("/api/sales/bulk", { method: "POST", body: JSON.stringify({ records: pendingCsv }) });
    pendingCsv = [];
    $("csvFile").value = "";
    const createdNames = (result.products_added || []).map((item) => item.name);
    const details = result.already_imported
      ? result.message
      : `${result.records_added} sales rows imported; ${createdNames.length} products added and ${result.products_matched} matched to inventory. ${createdNames.length ? `New: ${createdNames.join(", ")}. They start at zero stock, with unit costs estimated at 80% of average selling price.` : "Existing inventory details were preserved."}`;
    showInlineMessage("importMessage", details);
    toast(result.already_imported ? "This CSV was already imported; no duplicate sales were added." : "CSV imported. Product catalog and sales history are updated.");
    await refresh();
  } catch (error) {
    showInlineMessage("importMessage", error.message, true);
  } finally {
    button.disabled = !pendingCsv.length;
    button.textContent = "Import rows";
    applyLanguage();
  }
}

function wireEvents() {
  $("refreshBtn").addEventListener("click", refresh);
  $("inventorySearch").addEventListener("input", renderProducts);
  $("dailyTrendBtn").addEventListener("click", () => { state.trendPeriod = "daily"; renderSalesAnalytics(); });
  $("monthlyTrendBtn").addEventListener("click", () => { state.trendPeriod = "monthly"; renderSalesAnalytics(); });
  $("forecastForm").addEventListener("submit", buildForecast);
  $("forecastProduct").addEventListener("change", () => buildForecast());
  $("forecastDays").addEventListener("change", () => buildForecast());
  $("temperature").addEventListener("change", () => buildForecast());
  $("rain").addEventListener("change", () => buildForecast());
  $("saleProduct").addEventListener("change", () => {
    const product = state.products.find((item) => String(item.id) === $("saleProduct").value);
    if (product) $("salePrice").value = product.selling_price;
  });
  $("saleDate").value = new Date().toLocaleDateString("en-CA");
  $("saleForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const product = state.products.find((item) => String(item.id) === $("saleProduct").value);
    if (!product) return toast("Select a product first.", true);
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await api("/api/sales", { method: "POST", body: JSON.stringify({ product_name: product.name, sale_date: $("saleDate").value, quantity: Number($("saleQuantity").value), price: Number($("salePrice").value) }) });
      const receipt = `Sale saved: ${$("saleQuantity").value} ${product.name} on ${$("saleDate").value}. Forecasts refreshed.`;
      showInlineMessage("saleMessage", receipt);
      toast("Sale recorded and forecasts refreshed.");
      $("saleQuantity").value = "1";
      await refresh();
    } catch (error) { showInlineMessage("saleMessage", error.message, true); toast(error.message, true); }
    finally { button.disabled = false; }
  });
  $("addProductBtn").addEventListener("click", () => $("productFormWrap").classList.toggle("hidden"));
  $("cancelProductBtn").addEventListener("click", () => $("productFormWrap").classList.add("hidden"));
  $("closeProductEditBtn").addEventListener("click", () => $("productEditDialog").close());
  $("cancelProductEditBtn").addEventListener("click", () => $("productEditDialog").close());
  $("closeStockoutBtn").addEventListener("click", () => $("stockoutDialog").close());
  $("cancelStockoutBtn").addEventListener("click", () => $("stockoutDialog").close());
  $("stockoutForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = Object.fromEntries(new FormData(form));
    const payload = { product_id: Number(raw.product_id), stockout_date: raw.stockout_date,
      estimated_lost_units: raw.estimated_lost_units === "" ? null : Number(raw.estimated_lost_units), note: raw.note };
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const result = await api("/api/stockouts", { method: "POST", body: JSON.stringify(payload) });
      $("stockoutDialog").close();
      showInlineMessage("inventoryMessage", `${result.product} stockout note saved for ${result.date}. Forecast training will account for this unavailable day.`);
      toast("Stockout noted. Demand forecasts will account for the unavailable day.");
      await refresh();
      void buildForecast();
    } catch (error) { showInlineMessage("stockoutMessage", error.message, true); }
    finally { button.disabled = false; }
  });
  $("festivalPlanForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    showInlineMessage("festivalPlanMessage", "Forecasting the event window and fitting your budget and storage limits…");
    try {
      const result = await api("/api/planning/festival", { method: "POST", body: JSON.stringify({
        festival_name: $("planFestivalName").value.trim(), festival_date: $("planFestivalDate").value,
        budget_inr: Number($("planBudget").value), extra_storage_units: Number($("planStorage").value)
      }) });
      renderFestivalPlan(result);
      showInlineMessage("festivalPlanMessage", `Plan ready for ${result.festival_name}. ${result.ordered_product_count} order lines fit within your budget and storage limits.`);
      toast("Festival basket plan is ready.");
    } catch (error) { showInlineMessage("festivalPlanMessage", error.message, true); toast(error.message, true); }
    finally { button.disabled = false; }
  });
  $("productEditForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const productId = form.dataset.productId;
    const values = Object.fromEntries(new FormData(form));
    for (const key of ["stock", "supplier_lead_time_days"]) values[key] = Number(values[key]);
    for (const key of ["daily_demand", "holding_cost_per_unit_day", "selling_price", "unit_cost"]) values[key] = Number(values[key]);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await api(`/api/products/${productId}`, { method: "PUT", body: JSON.stringify(values) });
      const product = state.products.find((item) => String(item.id) === productId);
      $("productEditDialog").close();
      showInlineMessage("inventoryMessage", `${product?.name.trim() || "Product"} updated and saved.`);
      toast("Product inventory and pricing updated.");
      await refresh();
    } catch (error) {
      showInlineMessage("productEditMessage", error.message, true);
    } finally { button.disabled = false; }
  });
  $("productForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form));
    for (const key of ["stock"]) values[key] = Number(values[key]);
    for (const key of ["daily_demand", "supplier_lead_time_days", "holding_cost_per_unit_day", "selling_price", "unit_cost"]) values[key] = Number(values[key]);
    button.disabled = true;
    try {
      await api("/api/products", { method: "POST", body: JSON.stringify(values) });
      const name = values.name.trim();
      form.reset();
      form.elements.holding_cost_per_unit_day.value = "0";
      $("productFormWrap").classList.add("hidden");
      showInlineMessage("productMessage", `${name} added to inventory and saved.`);
      toast("Product added to inventory.");
      await refresh();
    } catch (error) { showInlineMessage("productMessage", error.message, true); toast(error.message, true); }
    finally { button.disabled = false; }
  });
  $("csvFile").addEventListener("change", async (event) => {
    pendingCsv = [];
    $("uploadCsvBtn").disabled = true;
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      $("importMessage").textContent = "Choose a CSV smaller than 2 MB.";
      $("importMessage").classList.add("error");
      return;
    }
    try {
      pendingCsv = parseCsv(await file.text());
      const present = new Set(state.products.map((product) => product.name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en")));
      const newNames = [...new Set(pendingCsv.map((row) => row.product_name.trim().replace(/\s+/g, " ")))]
        .filter((name) => !present.has(name.toLocaleLowerCase("en")));
      const preview = `${pendingCsv.length} valid sales rows ready. ${newNames.length} new products will be added automatically${newNames.length ? `: ${newNames.join(", ")}` : "; all product names match existing inventory"}.`;
      showInlineMessage("importMessage", preview);
      $("uploadCsvBtn").disabled = false;
    } catch (error) {
      showInlineMessage("importMessage", error.message, true);
    }
    applyLanguage();
  });
  $("uploadCsvBtn").addEventListener("click", importCsv);
  $("templateBtn").addEventListener("click", () => {
    const sampleProduct = state.products[0]?.name || "Rice";
    const csv = `date,product,quantity,price\n${new Date().toLocaleDateString("en-CA")},${sampleProduct},8,60\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = element("a"); link.href = url; link.download = "retailai-sales-template.csv"; link.click(); URL.revokeObjectURL(url);
    showInlineMessage("importMessage", "Sales CSV template downloaded.");
    toast("Sales CSV template downloaded.");
  });
  const languageSelect = $("languageSelect");
  languageSelect.value = currentLanguage;
  languageSelect.addEventListener("change", () => {
    applyLanguage(languageSelect.value);
    $("today").textContent = new Date().toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    renderMetricsCache();
    if (state.products.length) void buildForecast();
  });
}

let latestDashboard = null;
let latestSales = [];
function renderMetricsCache() {
  if (latestDashboard) renderMetrics(latestDashboard);
  renderProducts();
  renderInsights();
  renderSales(latestSales);
  renderSalesAnalytics();
  renderRankings();
  renderFestivalInsights();
  renderStockoutHistory();
  setFestivalPlanDefaults();
}

document.addEventListener("DOMContentLoaded", () => {
  $("today").textContent = new Date().toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  $("productForm").elements.holding_cost_per_unit_day.value = "0";
  wireEvents();
  applyLanguage();
  refresh();
});
