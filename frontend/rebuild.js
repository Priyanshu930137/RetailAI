"use strict";

const API = window.RETAILAI_API_URL || window.location.origin;
const $ = (id) => document.getElementById(id);
const state = { products: [], insights: [], analytics: null, festivals: [], weather: null, stockouts: [], stockAdjustments: [], retailActions: null, bundles: null, trendPeriod: "daily", toastTimer: null };
const localeByLanguage = { en: "en-IN", hi: "hi-IN", mr: "mr-IN" };
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
const languageCopy = {
  hi: {
    "STORE INTELLIGENCE": "दुकान की जानकारी", "My Market": "मेरा बाज़ार", "Neighbourhood store": "आपकी स्थानीय दुकान", "WORKSPACE": "कार्यक्षेत्र", "Overview": "अवलोकन", "Demand advisor": "मांग सलाहकार", "Inventory": "भंडार", "Sales & imports": "बिक्री और आयात", "Connecting to store data": "दुकान का डेटा जोड़ा जा रहा है", "Checking database…": "डेटाबेस जांच रहे हैं…", "Store database connected": "दुकान का डेटाबेस जुड़ा है", "Changes save automatically": "बदलाव अपने आप सहेजे जाते हैं", "Store database unavailable": "दुकान का डेटाबेस उपलब्ध नहीं है", "Refresh data": "डेटा ताज़ा करें", "YOUR STORE": "आपकी दुकान", "OVERVIEW": "अवलोकन", "MONDAY MORNING, RETAILER": "सुप्रभात, दुकानदार", "Make today’s stock": "आज के स्टॉक को", "work smarter.": "समझदारी से इस्तेमाल करें।", "A clear view of sales, demand, and your next best move.": "बिक्री, मांग और अगले सही कदम की साफ़ जानकारी।", "SALES · 14 DAYS": "बिक्री · 14 दिन", "UNITS SOLD · 14 DAYS": "बिकी इकाइयाँ · 14 दिन", "PRODUCTS TRACKED": "दर्ज उत्पाद", "REPLENISHMENT WATCH": "दोबारा स्टॉक भरें", "Import sales to see revenue": "राजस्व देखने के लिए बिक्री आयात करें", "Across recorded sales": "दर्ज बिक्री का कुल", "Units recorded in your sales history": "बिक्री इतिहास में दर्ज इकाइयाँ", "From saved transactions": "सहेजे गए लेन-देन से", "Products in your store inventory": "आपकी दुकान के भंडार में उत्पाद", "Inventory is database-backed": "भंडार डेटाबेस में सहेजा है", "Products with 3 days or less of cover": "3 दिन या कम चलने वाला स्टॉक", "Review inventory": "भंडार देखें", "FESTIVAL & SEASONAL PULSE": "त्योहार और मौसम की मांग", "Finding the next demand window…": "अगली मांग का समय खोज रहे हैं…", "Calendar signals help you plan earlier.": "त्योहार कैलेंडर से पहले योजना बनाएँ।", "WEATHER-AWARE FORECAST": "मौसम के अनुसार अनुमान", "Local conditions, considered": "स्थानीय मौसम को ध्यान में रखें", "Try heat or rain adjustments in the demand advisor.": "मांग सलाहकार में गर्मी या बारिश जोड़ें।", "SMART STOCK RISK": "स्टॉक का जोखिम", "Waiting for product data": "उत्पाद डेटा की प्रतीक्षा", "Stockout and excess stock risk by product.": "हर उत्पाद में कमी या अधिक स्टॉक का जोखिम।", "PERFORMANCE": "प्रदर्शन", "Sales pulse": "बिक्री का रुझान", "Saved revenue and units by day": "दिन के अनुसार सहेजा राजस्व और इकाइयाँ", "LAST 14 DAYS": "पिछले 14 दिन", "Revenue": "राजस्व", "Units sold": "बिकी इकाइयाँ", "TODAY’S OPPORTUNITY": "आज का अवसर", "Worth a look": "ध्यान देने योग्य", "Recommendations from your store data": "दुकान के डेटा से सुझाव", "Loading your store’s next actions…": "दुकान के लिए अगले कदम देख रहे हैं…", "Open demand advisor": "मांग सलाहकार खोलें", "PLAN WITH CONTEXT": "जानकारी के साथ योजना", "Demand advisor": "मांग सलाहकार", "Combine sales history with calendar and weather signals. See what changed and why.": "बिक्री इतिहास को त्योहार और मौसम के संकेतों से जोड़ें। बदलाव और कारण जानें।", "EXPLAINABLE ESTIMATE": "समझने योग्य अनुमान", "Product": "उत्पाद", "Planning horizon": "योजना अवधि", "Next 7 days": "अगले 7 दिन", "Next 14 days": "अगले 14 दिन", "Next 30 days": "अगले 30 दिन", "Temperature °C": "तापमान °C", "Rainfall mm/day": "बारिश mm/दिन", "optional": "वैकल्पिक", "Build forecast": "मांग का अनुमान बनाएँ", "Building forecast…": "अनुमान बना रहे हैं…", "Your forecast will appear here": "आपका अनुमान यहाँ दिखेगा", "Select a product and build your first forecast.": "उत्पाद चुनें और पहला अनुमान बनाएँ।", "Forecasts are transparent estimates, not guaranteed results. Festival dates are approximate; weather is manually supplied. Add sales history to improve product estimates.": "अनुमान पारदर्शी हैं, पक्की गारंटी नहीं। त्योहार की तारीखें अनुमानित हैं और मौसम हाथ से दर्ज होता है। बिक्री इतिहास जोड़कर अनुमान बेहतर करें।", "STOCK CONTROL": "स्टॉक नियंत्रण", "Monitor coverage, risk, and replenishment suggestions.": "स्टॉक की अवधि, जोखिम और दोबारा ऑर्डर के सुझाव देखें।", "Search inventory": "भंडार खोजें", "Add product": "उत्पाद जोड़ें", "Product name": "उत्पाद का नाम", "On-hand units": "मौजूद इकाइयाँ", "Avg. daily demand": "औसत दैनिक मांग", "Sell price (₹)": "बिक्री मूल्य (₹)", "Unit cost (₹)": "प्रति इकाई लागत (₹)", "Save product": "उत्पाद सहेजें", "Cancel": "रद्द करें", "PRODUCT": "उत्पाद", "ON HAND": "मौजूद", "DAILY DEMAND": "दैनिक मांग", "DAYS OF COVER": "स्टॉक के दिन", "STOCK RISK": "स्टॉक जोखिम", "HIGH RISK": "उच्च जोखिम", "MEDIUM RISK": "मध्यम जोखिम", "LOW RISK": "कम जोखिम", "PRICE / COST": "मूल्य / लागत", "Loading inventory…": "भंडार लोड हो रहा है…", "QUICK ENTRY": "त्वरित प्रविष्टि", "Record a sale": "बिक्री दर्ज करें", "Sales entries immediately update forecasts.": "बिक्री दर्ज होते ही अनुमान अपडेट होगा।", "Sale date": "बिक्री की तारीख", "Units": "इकाइयाँ", "Unit selling price (₹)": "प्रति इकाई बिक्री मूल्य (₹)", "Save sale": "बिक्री सहेजें", "HISTORY IMPORT": "इतिहास आयात", "Bring your sales history": "बिक्री इतिहास जोड़ें", "Upload CSV to get product-level demand forecasts.": "उत्पाद के अनुसार मांग अनुमान के लिए CSV अपलोड करें।", "Choose a sales CSV": "बिक्री CSV चुनें", "Columns: date, product, quantity, price": "कॉलम: date, product, quantity, price", "Download template": "नमूना फ़ाइल डाउनलोड करें", "Import rows": "पंक्तियाँ आयात करें", "Importing…": "आयात हो रहा है…", "RECENT ACTIVITY": "हाल की गतिविधि", "Sales history": "बिक्री इतिहास", "Most recent saved transactions": "हाल में सहेजे गए लेन-देन", "LATEST 12": "नवीनतम 12", "DATE": "तारीख", "UNITS": "इकाइयाँ", "UNIT PRICE": "इकाई मूल्य", "REVENUE": "राजस्व", "No products yet. Add your first product.": "अभी उत्पाद नहीं हैं। पहला उत्पाद जोड़ें।", "No matching products.": "कोई मिलता-जुलता उत्पाद नहीं।", "No sales recorded yet. Add a quick sale or import a CSV.": "अभी बिक्री दर्ज नहीं है। बिक्री दर्ज करें या CSV आयात करें।", "Add products to see store-specific recommendations.": "दुकान के सुझाव देखने के लिए उत्पाद जोड़ें।", "STOCK SCORE": "स्टॉक जोखिम स्कोर", "OVERSTOCK SCORE": "अधिक स्टॉक स्कोर", "EXPECTED DEMAND": "अनुमानित मांग", "STOCKOUT RISK": "स्टॉक खत्म होने का जोखिम", "OVERSTOCK RISK": "अधिक स्टॉक का जोखिम", "REORDER SUGGESTION": "दोबारा ऑर्डर सुझाव", "DEMAND-AWARE PRICE": "मांग के अनुसार मूल्य", "CALENDAR SIGNALS": "त्योहार और मौसम", "WEATHER INPUT": "मौसम जानकारी", "WHY THIS RECOMMENDATION": "इस सुझाव का कारण", "No seasonal uplift": "मौसमी बढ़ोतरी नहीं", "No major festival in this horizon": "इस अवधि में बड़ा त्योहार नहीं", "No local weather adjustment supplied": "स्थानीय मौसम दर्ज नहीं", "No products in inventory": "भंडार में उत्पाद नहीं", "Add products to calculate stock risk.": "स्टॉक जोखिम जानने के लिए उत्पाद जोड़ें।", "Seasonal demand signals are ready": "मौसमी मांग के संकेत तैयार हैं", "Forecast plus safety buffer": "अनुमान और सुरक्षा भंडार", "database": "डेटाबेस", " days cover · ": " दिन का स्टॉक · ", " units suggested": " इकाइयाँ सुझाई गईं", " days left at estimated demand. Order about ": " दिन का स्टॉक शेष। लगभग ", " units.": " इकाइयाँ मंगाएँ।", " confidence": " विश्वास स्तर", " confidence.": " विश्वास स्तर।", " low stockout risk": " स्टॉक खत्म होने का कम जोखिम", " medium stockout risk": " स्टॉक खत्म होने का मध्यम जोखिम", " high stockout risk": " स्टॉक खत्म होने का अधिक जोखिम", "Confidence: ": "विश्वास स्तर: ", " · local estimate": " · स्थानीय अनुमान", "low": "कम", "medium": "मध्यम", "high": "अधिक", "Summer": "गर्मी", "Monsoon": "मानसून", "Festive season": "त्योहारों का मौसम", "Winter": "सर्दी", "Diwali season": "दिवाली का मौसम", "Christmas": "क्रिसमस", "Holi": "होली", "Makar Sankranti": "मकर संक्रांति", "Independence Day": "स्वतंत्रता दिवस", "Festival window: ": "त्योहार अवधि: ", "Season: ": "मौसम: ", "Recent sales average ": "हाल की बिक्री का औसत ", " units/day": " इकाइयाँ/दिन", "Limited sales history; forecast confidence is lower": "बिक्री इतिहास कम है; अनुमान पर भरोसा कम रखें", "No recorded sales yet; using the configured daily-demand estimate": "बिक्री दर्ज नहीं है; निर्धारित दैनिक मांग से अनुमान", "Weather adjustment is a small heuristic from the supplied conditions": "दर्ज मौसम के आधार पर सीमित समायोजन किया गया", "Forecast generated": "मांग अनुमान तैयार", "Product added to inventory.": "उत्पाद भंडार में जोड़ा गया।", "Sale recorded. Forecasts updated from the new history.": "बिक्री दर्ज। अनुमान नए इतिहास के अनुसार अपडेट हुआ।", "Sales history imported and forecasts refreshed.": "बिक्री इतिहास आयात हुआ और अनुमान अपडेट हुए।", "Import rows": "पंक्तियाँ आयात करें", "Select a product first.": "पहले उत्पाद चुनें।", "Add a product before building a forecast.": "अनुमान बनाने से पहले उत्पाद जोड़ें।", "This product has sales history and cannot be deleted": "इस उत्पाद का बिक्री इतिहास है, इसे हटाया नहीं जा सकता।", "Add these products before importing sales: ": "बिक्री आयात करने से पहले ये उत्पाद जोड़ें: ", "No products yet": "अभी उत्पाद नहीं हैं", "Expiry date": "समाप्ति तिथि", "HSN code": "एचएसएन कोड", "GST rate (%)": "जीएसटी दर (%)", "Verify product classification": "उत्पाद वर्गीकरण जाँचें", "Set from official rate": "आधिकारिक दर भरें", "Hot list · sell before expiry": "समाप्ति से पहले बेचें", "Find at-risk stock and a margin-floored markdown suggestion. Expired goods are flagged for removal.": "समाप्ति के करीब स्टॉक देखें। छूट खरीद लागत से कम नहीं होगी; समाप्त सामान हटाएँ।", "Dead stock review": "न बिके स्टॉक की समीक्षा", "Find stock with no sales for 60 days and estimate the carrying cost.": "60 दिन से न बिके स्टॉक और उसकी भंडारण लागत देखें।", "Frequently bought together": "अक्सर साथ खरीदे जाने वाले उत्पाद", "Build practical kits such as bread + butter, pasta + sauce, tea + biscuits, or detergent + dish soap from your own co-purchase records.": "ब्रेड और मख्खन, पास्ता और सॉस, चाय और बिस्कुट जैसे किट अपनी खरीद की नोंद से बनाएं।", "Record the same bill ID on each sale line for customer-basket recommendations.": "ग्राहक की खरीद पहचानने के लिए एक बिल की सभी वस्तुओं पर समान बिल आईडी दर्ज करें।", "No products close to expiry.": "किसी उत्पाद की समाप्ति नजदीक नहीं है।", "Expired · remove from sale": "समाप्त · बिक्री से हटाएँ", "Sell before expiry": "समाप्ति से पहले बेचें", "days": "दिन", "units at risk": "जोखिम वाली इकाइयाँ", "Estimated price including GST:": "जीएसटी सहित अनुमानित कीमत:", "No dead stock matched the current rule.": "नियम के अनुसार कोई न बिका स्टॉक नहीं मिला।", "days since last sale": "आखिरी बिक्री से दिन", "Carrying cost estimate:": "भंडारण लागत अनुमान:", "Review price:": "समीक्षा कीमत:", "Not enough co-purchase history yet. Record bill IDs across multiple sales.": "साथ खरीद के लिए अभी पर्याप्त डेटा नहीं। कई विक्रय में बिल आईडी दर्ज करें।", "co-purchases": "साथ खरीद", "lift": "लिफ्ट", "confidence": "भरोसा", "5% bundle offer": "5% बंडल छूट", "Set HSN and GST rates on both products for a tax-inclusive estimate.": "कर सहित कीमत के अनुमान के लिए दोनों उत्पादों के एचएसएन और जीएसटी दर भरें।", "GST depends on HSN classification and product details. Confirm the current rate before using tax estimates.": "जीएसटी दर एचएसएन वर्गीकरण और उत्पाद विवरण पर निर्भर है। कर अनुमान से पहले मौजूदा दर जाँचें।", "Bill / transaction ID": "बिल / लेन-देन आईडी", "Use same ID for every item on one bill": "एक बिल की सभी वस्तुओं के लिए एक ही आईडी दें", "EXPIRY-AWARE CLEARANCE": "समाप्ति अवधि के अनुसार बिक्री", "CAPITAL RECOVERY": "फँसी पूंजी वापस पाएँ", "BASKET INTELLIGENCE": "खरीद टोकरी की जानकारी", "Price includes GST?": "क्या कीमत में जीएसटी शामिल है?", "Yes, price includes tax": "हाँ, कीमत में कर शामिल है", "No, add tax to price": "नहीं, कीमत में कर जोड़ें", "Confidence:": "भरोसा:", "Holdout MAE": "परीक्षण MAE", "vs mean-baseline MAE": "औसत आधार MAE के मुकाबले", "Model used:": "उपयोग किया गया मॉडल:", "Confidence:": "भरोसा:", "Seasonal baseline estimate": "मौसमी आधार अनुमान", "Never sold": "कभी नहीं बिका", "Pairs come from products sharing a bill ID.": "जोड़ियाँ एक ही बिल आईडी से जुड़ी हैं।", "Same-day pairs are a weak proxy, not proof the same customer bought both. Add bill IDs to new sales for customer-basket recommendations.": "एक दिन की साथ विक्री फिलहाल अनुमान है, यह प्रमाण नहीं कि एक ही ग्राहक ने दोनों खरीदे। ग्राहक की खरीद के सुझाव के लिए नई बिक्री में बिल आईडी भरें।", "Remove from sale. Do not discount or sell expired goods.": "बिक्री से हटाएं। समाप्त वस्तु पर छूट न दें और न बेचें।", "Prioritize sale before expiry; never sell after the expiry date.": "समाप्ति से पहले बिक्री को प्राथमिकता दें; मुदत संपने के बाद न बेचें।", "vs seven-day seasonal MAE": "केवल सात दिन के मौसमी MAE के मुकाबले", "mean-baseline MAE": "सरासरी आधार MAE"
  },
  mr: {
    "STORE INTELLIGENCE": "दुकान व्यवस्थापन", "My Market": "माझा बाजार", "Neighbourhood store": "आपले स्थानिक दुकान", "WORKSPACE": "कार्य क्षेत्र", "Overview": "आढावा", "Demand advisor": "मागणी सल्लागार", "Inventory": "साठा", "Sales & imports": "विक्री आणि आयात", "Connecting to store data": "दुकानचा डेटा जोडत आहे", "Checking database…": "डेटाबेस तपासत आहे…", "Store database connected": "दुकानचा डेटाबेस जोडला", "Changes save automatically": "बदल आपोआप जतन होतात", "Store database unavailable": "दुकानचा डेटाबेस उपलब्ध नाही", "Refresh data": "डेटा रिफ्रेश करा", "YOUR STORE": "तुमचे दुकान", "OVERVIEW": "आढावा", "MONDAY MORNING, RETAILER": "शुभ सकाळ, दुकानदार", "Make today’s stock": "आजचा साठा", "work smarter.": "अधिक हुशारीने वापरा.", "A clear view of sales, demand, and your next best move.": "विक्री, मागणी आणि पुढील योग्य कृतीचा स्पष्ट आढावा.", "SALES · 14 DAYS": "विक्री · १४ दिवस", "UNITS SOLD · 14 DAYS": "विकलेल्या वस्तू · १४ दिवस", "PRODUCTS TRACKED": "नोंदवलेली उत्पादने", "REPLENISHMENT WATCH": "पुन्हा साठा भरा", "Import sales to see revenue": "महसूल पाहण्यासाठी विक्री आयात करा", "Across recorded sales": "नोंदवलेल्या विक्रीतून", "Units recorded in your sales history": "विक्री इतिहासातील नोंदवलेल्या वस्तू", "From saved transactions": "जतन केलेल्या व्यवहारांतून", "Products in your store inventory": "दुकानच्या साठ्यातील उत्पादने", "Inventory is database-backed": "साठा डेटाबेसमध्ये जतन आहे", "Products with 3 days or less of cover": "३ दिवस किंवा कमी पुरेल असा साठा", "Review inventory": "साठा तपासा", "FESTIVAL & SEASONAL PULSE": "सण आणि हंगामी मागणी", "Finding the next demand window…": "मागणीचा पुढील काळ शोधत आहे…", "Calendar signals help you plan earlier.": "सणांच्या तारखांनुसार आधी नियोजन करा.", "WEATHER-AWARE FORECAST": "हवामानानुसार अंदाज", "Local conditions, considered": "स्थानिक हवामानाचा विचार", "Try heat or rain adjustments in the demand advisor.": "मागणी सल्लागारात उष्णता किंवा पावसाची माहिती द्या.", "SMART STOCK RISK": "साठ्याचा धोका", "Waiting for product data": "उत्पादनाच्या डेटाची प्रतीक्षा", "Stockout and excess stock risk by product.": "प्रत्येक उत्पादनातील कमी किंवा जादा साठ्याचा धोका.", "PERFORMANCE": "कामगिरी", "Sales pulse": "विक्रीचा कल", "Saved revenue and units by day": "दिवसानुसार जतन केलेला महसूल आणि वस्तू", "LAST 14 DAYS": "मागील १४ दिवस", "Revenue": "महसूल", "Units sold": "विकलेल्या वस्तू", "TODAY’S OPPORTUNITY": "आजची संधी", "Worth a look": "लक्ष देण्यासारखे", "Recommendations from your store data": "दुकानाच्या डेटावर आधारित सूचना", "Loading your store’s next actions…": "दुकानासाठी पुढील कृती शोधत आहे…", "Open demand advisor": "मागणी सल्लागार उघडा", "PLAN WITH CONTEXT": "माहितीच्या आधारे नियोजन", "Combine sales history with calendar and weather signals. See what changed and why.": "विक्री इतिहासासोबत सण आणि हवामानाचे संकेत जोडा. काय बदलले आणि का ते पहा.", "EXPLAINABLE ESTIMATE": "समजण्यास सोपा अंदाज", "Product": "उत्पादन", "Planning horizon": "नियोजन कालावधी", "Next 7 days": "पुढील ७ दिवस", "Next 14 days": "पुढील १४ दिवस", "Next 30 days": "पुढील ३० दिवस", "Temperature °C": "तापमान °C", "Rainfall mm/day": "पाऊस mm/दिवस", "optional": "ऐच्छिक", "Build forecast": "मागणीचा अंदाज तयार करा", "Building forecast…": "अंदाज तयार होत आहे…", "Your forecast will appear here": "तुमचा अंदाज येथे दिसेल", "Select a product and build your first forecast.": "उत्पादन निवडा आणि पहिला अंदाज तयार करा.", "Forecasts are transparent estimates, not guaranteed results. Festival dates are approximate; weather is manually supplied. Add sales history to improve product estimates.": "हे स्पष्ट अंदाज आहेत, हमी नाही. सणांच्या तारखा अंदाजे आहेत आणि हवामान हाताने भरावे लागते. विक्री इतिहास जोडा म्हणजे अंदाज सुधारेल.", "STOCK CONTROL": "साठा नियंत्रण", "Monitor coverage, risk, and replenishment suggestions.": "साठा किती दिवस पुरेल, धोका आणि पुन्हा मागवण्याच्या सूचना पहा.", "Search inventory": "साठा शोधा", "Add product": "उत्पादन जोडा", "Product name": "उत्पादनाचे नाव", "On-hand units": "उपलब्ध वस्तू", "Avg. daily demand": "सरासरी दैनिक मागणी", "Sell price (₹)": "विक्री किंमत (₹)", "Unit cost (₹)": "प्रति वस्तू खर्च (₹)", "Save product": "उत्पादन जतन करा", "Cancel": "रद्द करा", "PRODUCT": "उत्पादन", "ON HAND": "उपलब्ध", "DAILY DEMAND": "दैनिक मागणी", "DAYS OF COVER": "साठा पुरण्याचे दिवस", "STOCK RISK": "साठ्याचा धोका", "PRICE / COST": "किंमत / खर्च", "Loading inventory…": "साठा लोड होत आहे…", "QUICK ENTRY": "जलद नोंद", "Record a sale": "विक्री नोंदवा", "Sales entries immediately update forecasts.": "विक्री नोंदवल्यावर अंदाज लगेच बदलेल.", "Sale date": "विक्रीची तारीख", "Units": "वस्तू", "Unit selling price (₹)": "प्रति वस्तू विक्री किंमत (₹)", "Save sale": "विक्री जतन करा", "HISTORY IMPORT": "इतिहास आयात", "Bring your sales history": "विक्री इतिहास आणा", "Upload CSV to get product-level demand forecasts.": "उत्पादननिहाय मागणीच्या अंदाजासाठी CSV अपलोड करा.", "Choose a sales CSV": "विक्री CSV निवडा", "Columns: date, product, quantity, price": "स्तंभ: date, product, quantity, price", "Download template": "नमुना डाउनलोड करा", "Import rows": "नोंदी आयात करा", "Importing…": "आयात होत आहे…", "RECENT ACTIVITY": "अलीकडील व्यवहार", "Sales history": "विक्री इतिहास", "Most recent saved transactions": "अलीकडे जतन केलेले व्यवहार", "LATEST 12": "अलीकडील १२", "DATE": "तारीख", "UNITS": "वस्तू", "UNIT PRICE": "प्रति वस्तू किंमत", "REVENUE": "महसूल", "No products yet. Add your first product.": "अजून उत्पादने नाहीत. पहिले उत्पादन जोडा.", "No matching products.": "जुळणारी उत्पादने नाहीत.", "No sales recorded yet. Add a quick sale or import a CSV.": "अजून विक्री नोंदवलेली नाही. विक्री नोंदवा किंवा CSV आयात करा.", "Add products to see store-specific recommendations.": "दुकानासाठी सूचना पाहण्यासाठी उत्पादने जोडा.", "STOCK SCORE": "साठा जोखीम गुण", "OVERSTOCK SCORE": "जादा साठा गुण", "EXPECTED DEMAND": "अंदाजित मागणी", "STOCKOUT RISK": "साठा संपण्याचा धोका", "OVERSTOCK RISK": "जादा साठ्याचा धोका", "REORDER SUGGESTION": "पुन्हा मागवण्याची सूचना", "DEMAND-AWARE PRICE": "मागणीनुसार किंमत", "CALENDAR SIGNALS": "सण आणि हंगाम", "WEATHER INPUT": "हवामान माहिती", "WHY THIS RECOMMENDATION": "या सूचनेचे कारण", "No seasonal uplift": "हंगामी वाढ नाही", "No major festival in this horizon": "या कालावधीत मोठा सण नाही", "No local weather adjustment supplied": "स्थानिक हवामान भरलेले नाही", "No products in inventory": "साठ्यात उत्पादने नाहीत", "Add products to calculate stock risk.": "साठ्याचा धोका मोजण्यासाठी उत्पादने जोडा.", "Seasonal demand signals are ready": "हंगामी मागणीचे संकेत तयार आहेत", "Forecast plus safety buffer": "अंदाज आणि सुरक्षित राखीव साठा", " days cover · ": " दिवसांचा साठा · ", " units suggested": " वस्तूंची सूचना", " low stockout risk": " साठा संपण्याचा कमी धोका", " medium stockout risk": " साठा संपण्याचा मध्यम धोका", " high stockout risk": " साठा संपण्याचा जास्त धोका", "Confidence: ": "विश्वास पातळी: ", " · local estimate": " · स्थानिक अंदाज", "low": "कमी", "medium": "मध्यम", "high": "जास्त", "Summer": "उन्हाळा", "Monsoon": "पावसाळा", "Festive season": "सणांचा हंगाम", "Winter": "हिवाळा", "Diwali season": "दिवाळीचा हंगाम", "Christmas": "नाताळ", "Holi": "होळी", "Makar Sankranti": "मकर संक्रांत", "Independence Day": "स्वातंत्र्यदिन", "Festival window: ": "सणाचा कालावधी: ", "Season: ": "हंगाम: ", "Recent sales average ": "अलीकडील विक्रीची सरासरी ", " units/day": " वस्तू/दिवस", "Limited sales history; forecast confidence is lower": "विक्री इतिहास कमी आहे; अंदाजावरील विश्वास कमी", "No recorded sales yet; using the configured daily-demand estimate": "विक्री नोंद नाही; ठरवलेली दैनिक मागणी वापरली आहे", "Weather adjustment is a small heuristic from the supplied conditions": "दिलेल्या हवामानावर मर्यादित समायोजन केले", "Product added to inventory.": "उत्पादन साठ्यात जोडले.", "Sale recorded. Forecasts updated from the new history.": "विक्री नोंदवली. नवीन इतिहासानुसार अंदाज बदलला.", "Sales history imported and forecasts refreshed.": "विक्री इतिहास आयात केला आणि अंदाज अपडेट केले.", "Select a product first.": "आधी उत्पादन निवडा.", "Add a product before building a forecast.": "अंदाजापूर्वी उत्पादन जोडा.", "This product has sales history and cannot be deleted": "या उत्पादनाचा विक्री इतिहास आहे, ते हटवता येणार नाही.", "Add these products before importing sales: ": "विक्री आयात करण्यापूर्वी ही उत्पादने जोडा: "
  }
};
const extraLanguageCopy = {
  hi: {
    "Approximate retail calendar. Confirm local festival dates and supplier schedules.": "यह अनुमानित त्योहार कैलेंडर है। स्थानीय तारीखें और आपूर्तिकर्ता का समय पक्का करें।",
    "Checking the festival calendar…": "त्योहार कैलेंडर देखा जा रहा है…",
    "DEMAND MEMORY": "मांग का इतिहास",
    "Decision support for your neighbourhood store.": "आपकी स्थानीय दुकान के लिए निर्णय सहायता।",
    "Edit product": "उत्पाद संपादित करें",
    "Event date": "कार्यक्रम की तारीख",
    "Explains every suggestion": "हर सुझाव का कारण बताता है",
    "Festival insights": "त्योहार की जानकारी",
    "GST Portal HSN search": "जीएसटी पोर्टल पर एचएसएन खोजें",
    "Keep an unavailable day from looking like a day with no demand.": "जिस दिन स्टॉक उपलब्ध नहीं था, उसे बिना मांग वाला दिन न मानें।",
    "Learning product combinations…": "उत्पादों के साथ खरीदे जाने के तरीके सीख रहे हैं…",
    "Loading dead stock…": "निष्क्रिय स्टॉक लोड हो रहा है…",
    "Loading expiry actions…": "समाप्ति तारीख की कार्रवाइयाँ लोड हो रही हैं…",
    "Loading product sales…": "उत्पाद की बिक्री लोड हो रही है…",
    "Loading products…": "उत्पाद लोड हो रहे हैं…",
    "Loading sales history…": "बिक्री इतिहास लोड हो रहा है…",
    "Plans around your calendar": "त्योहार कैलेंडर के अनुसार योजना",
    "Sales trends": "बिक्री का रुझान",
    "Use familiar Hindi or Marathi, quick sales entry, and simple inventory controls.": "अपनी भाषा में सरल स्टॉक नियंत्रण और बिक्री दर्ज करने की सुविधा पाएँ।",
    "Update stock, demand, and price/cost assumptions.": "स्टॉक, मांग और कीमत या लागत की जानकारी बदलें।",
    "With no lost-unit estimate, this date is excluded from model training and recent-demand lags are imputed. Existing inventory and sales records are not changed.": "बिकी न जा सकी मात्रा का अनुमान न होने पर यह तारीख मॉडल प्रशिक्षण से हटाई जाती है और हाल की मांग का अनुमान लगाया जाता है। मौजूदा स्टॉक और बिक्री रिकॉर्ड नहीं बदलते।",
    "Festival Basket Planner": "त्योहार खरीद योजना", "Turn a local event into a supplier-ready order plan that respects your budget and available space.": "स्थानीय त्योहार के लिए बजट और उपलब्ध जगह के अनुसार खरीद योजना बनाएँ।", "Festival or local event": "त्योहार या स्थानीय आयोजन", "Purchase budget (₹)": "खरीद बजट (₹)", "Extra storage available (units)": "अतिरिक्त उपलब्ध भंडारण (इकाइयाँ)", "Build my basket": "मेरी खरीद सूची बनाएँ", "Your order plan will appear here": "आपकी खरीद योजना यहाँ दिखेगी", "Choose an event, budget, and storage limit.": "आयोजन, बजट और भंडारण सीमा चुनें।", "Recent availability notes": "हाल की स्टॉक अनुपलब्धता", "Stockout days help correct your demand history.": "स्टॉक खत्म होने के दिन मांग इतिहास को सही करने में मदद करते हैं।", "No stockout notes yet.": "अभी स्टॉक खत्म होने की कोई जानकारी नहीं।", "Log stockout": "स्टॉक खत्म दर्ज करें", "Report a stockout": "स्टॉक खत्म होने की जानकारी दें", "Save stockout note": "स्टॉक जानकारी सहेजें", "Unavailable date": "स्टॉक खत्म होने की तारीख", "Estimated lost units": "अनुमानित छूटी बिक्री", "optional": "वैकल्पिक", "Availability notes": "उपलब्धता की जानकारी",
    "OPTIONAL WEATHER INPUT": "वैकल्पिक मौसम जानकारी", "Adjust a forecast for local conditions": "स्थानीय परिस्थितियों के लिए अनुमान बदलें", "Add temperature or rainfall in the demand advisor.": "मांग सलाहकार में तापमान या बारिश जोड़ें।", "Missing products are added automatically. New items start at 0 stock; estimated cost is editable in inventory.": "छूटे उत्पाद अपने आप जुड़ेंगे। नए उत्पाद 0 स्टॉक से शुरू होंगे; अनुमानित लागत भंडार में बदलें।", "INVENTORY EDITOR": "भंडार संपादक", "Save changes": "बदलाव सहेजें", "Cancel": "रद्द करें", "On-hand units": "मौजूद इकाइयाँ", "Average daily demand": "औसत दैनिक मांग", "Supplier lead time (days)": "आपूर्ति समय (दिन)", "Holding cost / unit / day (₹)": "भंडारण लागत / इकाई / दिन (₹)", "Selling price (₹)": "बिक्री मूल्य (₹)", "Unit cost (₹)": "इकाई लागत (₹)",
    "Sales intelligence": "बिक्री जानकारी", "SALES INTELLIGENCE": "बिक्री जानकारी", "Daily & monthly sales trends": "दैनिक और मासिक बिक्री रुझान", "Compare recorded units and revenue across time.": "समय के साथ दर्ज बिक्री और राजस्व की तुलना करें।", "Daily · 30 days": "दैनिक · 30 दिन", "Monthly · 12 months": "मासिक · 12 महीने", "TOP PERFORMERS · 90 DAYS": "शीर्ष उत्पाद · 90 दिन", "Best-selling products": "सबसे अधिक बिकने वाले उत्पाद", "Ranked by units sold, with revenue shown.": "बिकी इकाइयों के आधार पर क्रम, साथ में राजस्व।", "NEEDS ATTENTION · 90 DAYS": "ध्यान दें · 90 दिन", "Lowest-selling products": "सबसे कम बिकने वाले उत्पाद", "Includes items with no recorded sales.": "बिना बिक्री वाले उत्पाद भी शामिल हैं।", "PLAN AHEAD": "पहले से योजना बनाएँ", "Upcoming festival insights": "आगामी त्योहार जानकारी", "Check supplier lead time and place orders before demand windows.": "आपूर्तिकर्ता समय देखें और मांग बढ़ने से पहले ऑर्डर दें।", "NEXT 120 DAYS": "अगले 120 दिन", "Supplier lead time (days)": "आपूर्ति समय (दिन)", "Holding cost / unit / day (₹)": "भंडारण लागत / इकाई / दिन (₹)", "LEAD TIME": "आपूर्ति समय", "HOLDING COST / DAY": "दैनिक भंडारण लागत", "SUPPLIER & HOLDING COST": "आपूर्ति और भंडारण लागत", "current carrying cost": "मौजूदा भंडारण लागत", "excess holding cost over horizon": "अवधि की अतिरिक्त भंडारण लागत", "Edit plan": "योजना बदलें", "No listed festival windows in the next 120 days.": "अगले 120 दिनों में त्योहार सूचीबद्ध नहीं हैं।", "No products in inventory yet.": "भंडार में अभी उत्पाद नहीं हैं।", "Check suppliers now": "आपूर्तिकर्ता से अभी संपर्क करें", "Review purchase by ": "इस तारीख तक खरीद देखें ", "days away": "दिन बाकी", "units": "इकाइयाँ", "days": "दिन", "units/day": "इकाइयाँ/दिन"
  },
  mr: {
    "Approximate retail calendar. Confirm local festival dates and supplier schedules.": "हा सणांचा अंदाजित दिनदर्शिका आहे. स्थानिक तारखा आणि पुरवठादाराचे वेळापत्रक तपासा.",
    "Checking the festival calendar…": "सणांची दिनदर्शिका तपासत आहे…",
    "DEMAND MEMORY": "मागणीचा इतिहास",
    "Decision support for your neighbourhood store.": "तुमच्या स्थानिक दुकानासाठी निर्णय सहाय्य.",
    "Edit product": "उत्पादन संपादित करा",
    "Event date": "कार्यक्रमाची तारीख",
    "Explains every suggestion": "प्रत्येक सूचनेचे कारण सांगते",
    "Festival insights": "सणांची माहिती",
    "GST Portal HSN search": "GST पोर्टलवर HSN शोधा",
    "Keep an unavailable day from looking like a day with no demand.": "साठा उपलब्ध नसलेला दिवस मागणी नसलेला दिवस समजू नका.",
    "Learning product combinations…": "एकत्र खरेदी होणाऱ्या वस्तू शिकत आहे…",
    "Loading dead stock…": "निष्क्रिय साठा लोड होत आहे…",
    "Loading expiry actions…": "मुदत संपण्याच्या सूचना लोड होत आहेत…",
    "Loading product sales…": "उत्पादनाची विक्री लोड होत आहे…",
    "Loading products…": "उत्पादने लोड होत आहेत…",
    "Loading sales history…": "विक्रीचा इतिहास लोड होत आहे…",
    "Plans around your calendar": "सणांच्या दिनदर्शिकेनुसार नियोजन",
    "Sales trends": "विक्रीचा कल",
    "Use familiar Hindi or Marathi, quick sales entry, and simple inventory controls.": "आपल्या भाषेत सोपे साठा नियंत्रण आणि जलद विक्री नोंद वापरा.",
    "Update stock, demand, and price/cost assumptions.": "साठा, मागणी आणि किंमत किंवा खर्चाची माहिती बदला.",
    "With no lost-unit estimate, this date is excluded from model training and recent-demand lags are imputed. Existing inventory and sales records are not changed.": "गमावलेल्या विक्रीचा अंदाज नसल्यास ही तारीख मॉडेल प्रशिक्षणातून वगळली जाते आणि अलीकडील मागणीचा अंदाज घेतला जातो. सध्याचा साठा आणि विक्री नोंदी बदलत नाहीत.",
    "Festival Basket Planner": "सण खरेदी नियोजक", "Turn a local event into a supplier-ready order plan that respects your budget and available space.": "स्थानिक सणासाठी बजेट आणि उपलब्ध जागेनुसार खरेदी योजना तयार करा.", "Festival or local event": "सण किंवा स्थानिक कार्यक्रम", "Purchase budget (₹)": "खरेदीचे बजेट (₹)", "Extra storage available (units)": "अतिरिक्त उपलब्ध साठवण (युनिट)", "Build my basket": "माझी खरेदी सूची तयार करा", "Your order plan will appear here": "तुमची खरेदी योजना येथे दिसेल", "Choose an event, budget, and storage limit.": "कार्यक्रम, बजेट आणि साठवण मर्यादा निवडा.", "Recent availability notes": "अलीकडील साठा नोंदी", "Stockout days help correct your demand history.": "साठा नसलेले दिवस मागणीचा इतिहास सुधारण्यास मदत करतात.", "No stockout notes yet.": "साठा नसल्याची नोंद नाही.", "Log stockout": "साठा संपल्याची नोंद", "Report a stockout": "साठा संपल्याची माहिती द्या", "Save stockout note": "साठ्याची नोंद जतन करा", "Unavailable date": "साठा संपल्याची तारीख", "Estimated lost units": "अंदाजे गमावलेली विक्री", "optional": "ऐच्छिक", "Availability notes": "साठ्याच्या नोंदी",
    "OPTIONAL WEATHER INPUT": "पर्यायी हवामान माहिती", "Adjust a forecast for local conditions": "स्थानिक परिस्थितीनुसार अंदाज बदला", "Add temperature or rainfall in the demand advisor.": "मागणी सल्लागारात तापमान किंवा पाऊस जोडा.", "Missing products are added automatically. New items start at 0 stock; estimated cost is editable in inventory.": "नसलेली उत्पादने आपोआप जोडली जातील. नवीन उत्पादने 0 साठ्याने सुरू होतील; अंदाजे किंमत साठ्यात बदलता येईल.", "INVENTORY EDITOR": "साठा संपादक", "Save changes": "बदल जतन करा", "Cancel": "रद्द करा", "On-hand units": "हातातील युनिट", "Average daily demand": "सरासरी दैनंदिन मागणी", "Supplier lead time (days)": "पुरवठा वेळ (दिवस)", "Holding cost / unit / day (₹)": "साठवण खर्च / युनिट / दिवस (₹)", "Selling price (₹)": "विक्री किंमत (₹)", "Unit cost (₹)": "प्रति युनिट खर्च (₹)",
    "Sales intelligence": "विक्री माहिती", "SALES INTELLIGENCE": "विक्री माहिती", "Daily & monthly sales trends": "दैनिक आणि मासिक विक्रीचा कल", "Compare recorded units and revenue across time.": "वेगवेगळ्या कालावधीतील नोंदवलेली विक्री आणि महसूल तुलना करा.", "Daily · 30 days": "दैनिक · ३० दिवस", "Monthly · 12 months": "मासिक · १२ महिने", "TOP PERFORMERS · 90 DAYS": "सर्वाधिक विक्री · ९० दिवस", "Best-selling products": "सर्वाधिक विकली जाणारी उत्पादने", "Ranked by units sold, with revenue shown.": "विकलेल्या वस्तूंनुसार क्रम आणि महसूल.", "NEEDS ATTENTION · 90 DAYS": "लक्ष द्या · ९० दिवस", "Lowest-selling products": "सर्वात कमी विकली जाणारी उत्पादने", "Includes items with no recorded sales.": "विक्री नोंद नसलेली उत्पादनेही समाविष्ट.", "PLAN AHEAD": "आधी नियोजन करा", "Upcoming festival insights": "आगामी सणांची माहिती", "Check supplier lead time and place orders before demand windows.": "पुरवठ्याचा कालावधी तपासा आणि मागणी वाढण्यापूर्वी ऑर्डर द्या.", "NEXT 120 DAYS": "पुढील १२० दिवस", "Supplier lead time (days)": "पुरवठ्याचा कालावधी (दिवस)", "Holding cost / unit / day (₹)": "साठवण खर्च / वस्तू / दिवस (₹)", "LEAD TIME": "पुरवठा कालावधी", "HOLDING COST / DAY": "दैनिक साठवण खर्च", "SUPPLIER & HOLDING COST": "पुरवठा आणि साठवण खर्च", "current carrying cost": "सध्याचा साठवण खर्च", "excess holding cost over horizon": "कालावधीतील अतिरिक्त साठवण खर्च", "Edit plan": "योजना बदला", "No listed festival windows in the next 120 days.": "पुढील १२० दिवसांत सण नोंदलेले नाहीत.", "No products in inventory yet.": "साठ्यात अजून उत्पादने नाहीत.", "Check suppliers now": "पुरवठादाराशी आता संपर्क करा", "Review purchase by ": "या तारखेपर्यंत खरेदी तपासा ", "days away": "दिवस बाकी", "units": "वस्तू", "days": "दिवस", "units/day": "वस्तू/दिवस", "Expiry date": "मुदत संपण्याची तारीख", "HSN code": "एचएसएन कोड", "GST rate (%)": "जीएसटी दर (%)", "Verify product classification": "उत्पादनाचे वर्गीकरण तपासा", "Set from official rate": "अधिकृत दर भरा", "Hot list · sell before expiry": "मुदतीपूर्वी विक्री करा", "Find at-risk stock and a margin-floored markdown suggestion. Expired goods are flagged for removal.": "मुदत जवळ आलेला साठा तपासा। सूट खरेदी खर्चाखाली जाणार नाही; मुदत संपलेला माल विक्रीतून काढा.", "Dead stock review": "न विकलेल्या साठ्याचा आढावा", "Find stock with no sales for 60 days and estimate the carrying cost.": "60 दिवस न विकलेला साठा आणि साठवण खर्च तपासा.", "Frequently bought together": "एकत्र खरेदी होणारी उत्पादने", "Build practical kits such as bread + butter, pasta + sauce, tea + biscuits, or detergent + dish soap from your own co-purchase records.": "ब्रेड आणि बटर, पास्ता आणि सॉस, चहा आणि बिस्किटे अशा जोड्या विक्रीच्या नोंदीवरून सुचवा.", "Record the same bill ID on each sale line for customer-basket recommendations.": "ग्राहकाची खरेदी ओळखण्यासाठी एकाच बिलवरील सर्व वस्तूंना तीच बिल आयडी नोंदवा.", "No products close to expiry.": "मुदत जवळ आलेले उत्पादन नाही.", "Expired · remove from sale": "मुदत संपली · विक्रीतून काढा", "Sell before expiry": "मुदतीपूर्वी विका", "days": "दिवस", "units at risk": "जोखीमीतील नग", "Estimated price including GST:": "जीएसटीसह अंदाजित किंमत:", "No dead stock matched the current rule.": "नियमानुसार न विकलेला साठा आढळला नाही.", "days since last sale": "शेवटच्या विक्रीपासून दिवस", "Carrying cost estimate:": "साठवण खर्चाचा अंदाज:", "Review price:": "पुनरावलोकन किंमत:", "Not enough co-purchase history yet. Record bill IDs across multiple sales.": "एकत्र खरेदीच्या शिफारशीसाठी पुरेशी माहिती नाही. अनेक विक्रींमध्ये बिल आयडी नोंदवा.", "co-purchases": "एकत्र खरेद", "lift": "लिफ्ट", "confidence": "विश्वास", "5% bundle offer": "5% संच सवलत", "Set HSN and GST rates on both products for a tax-inclusive estimate.": "करासह किंमतीच्या अंदाजासाठी दोन्ही उत्पादनांचे एचएसएन आणि जीएसटी दर भरा.", "GST depends on HSN classification and product details. Confirm the current rate before using tax estimates.": "जीएसटी दर एचएसएन वर्गीकरण आणि उत्पादनाच्या तपशिलांवर अवलंबून असतो. अंदाज वापरण्यापूर्वी सध्याचा दर तपासा.", "Bill / transaction ID": "बिल / व्यवहार आयडी", "Use same ID for every item on one bill": "एका बिलवरील सर्व वस्तूंसाठी तीच आयडी वापरा", "EXPIRY-AWARE CLEARANCE": "मुदतीनुसार सुटसुटीत विक्री", "CAPITAL RECOVERY": "अडकलेले भांडवल मोकळे करा", "BASKET INTELLIGENCE": "खरेदी पिशवीची माहिती", "Price includes GST?": "किंमतीत जीएसटी समाविष्ट आहे?", "Yes, price includes tax": "होय, किंमतीत कर समाविष्ट आहे", "No, add tax to price": "नाही, किंमतीत कर जोडा", "Confidence:": "विश्वास:", "Holdout MAE": "होल्डआउट MAE", "vs mean-baseline MAE": "सरासरी आधार MAE पेक्षा", "Model used:": "वापरलेले मॉडेल:", "Confidence:": "विश्वास:", "Seasonal baseline estimate": "हंगामी आधारावरील अंदाज", "Never sold": "कधीही विकले नाही", "Pairs come from products sharing a bill ID.": "जोड्या एकाच बिल आयडीशी संबंधित आहेत.", "Same-day pairs are a weak proxy, not proof the same customer bought both. Add bill IDs to new sales for customer-basket recommendations.": "एका दिवशी एकत्र विकलेल्या जोड्या हा फक्त अंदाज आहे; तीच ग्राहकाने दोन्ही घेतली याचा पुरावा नाही. ग्राहक खरेदीच्या शिफारशीसाठी नव्या विक्रीवर बिल आयडी भरा.", "Remove from sale. Do not discount or sell expired goods.": "विक्रीतून काढा. मुदत संपलेल्या वस्तूवर सूट देऊ नका आणि विकू नका.", "Prioritize sale before expiry; never sell after the expiry date.": "मुदतीपूर्वी विक्रीला प्राधान्य द्या; मुदत संपल्यानंतर कधीही विकू नका.", "vs seven-day seasonal MAE": "सात दिवसांच्या हंगामी MAE पेक्षा", "mean-baseline MAE": "सरासरी आधार MAE"
  }
};
Object.assign(extraLanguageCopy.hi, {
  "TOTAL SALES REVENUE": "कुल बिक्री राजस्व", "All saved transactions": "सभी सहेजे गए लेन-देन",
  "Hot selling products": "तेज़ बिकने वाले उत्पाद", "Products are suggested only when repeated bill-level purchase patterns support the relationship.": "उत्पाद तभी सुझाए जाते हैं जब कई बिलों में साथ खरीदे जाने का प्रमाण मिले।",
  "Update stock": "स्टॉक अपडेट करें", "Download feature demo CSV": "डेमो CSV डाउनलोड करें",
  "Adjust stock": "स्टॉक बदलें", "Edit product": "उत्पाद संपादित करें", "Hot seller": "तेज़ बिकने वाला",
  "Frequently bought together": "अक्सर साथ खरीदे जाने वाले", "Recent stock changes": "स्टॉक में हाल के बदलाव",
  "Quick stock update": "स्टॉक में तुरंत बदलाव", "Current stock:": "मौजूदा स्टॉक:",
  "Units to add or remove": "जोड़ने या घटाने की इकाइयाँ", "New delivery": "नई खेप",
  "Customer return": "ग्राहक वापसी", "Damaged / expired": "क्षतिग्रस्त / समय-सीमा समाप्त",
  "Stock count correction": "स्टॉक गिनती सुधार", "Save stock update": "स्टॉक बदलाव सहेजें",
  "units": "इकाइयाँ", "balance": "शेष स्टॉक", "shared bills": "साझा बिल"
});
Object.assign(extraLanguageCopy.mr, {
  "TOTAL SALES REVENUE": "एकूण विक्री महसूल", "All saved transactions": "सर्व जतन केलेले व्यवहार",
  "Hot selling products": "जलद विक्री होणारी उत्पादने", "Products are suggested only when repeated bill-level purchase patterns support the relationship.": "अनेक बिलांमधील एकत्र खरेदीचा पुरावा असल्यासच उत्पादने सुचवली जातात.",
  "Update stock": "साठा अपडेट करा", "Download feature demo CSV": "डेमो CSV डाउनलोड करा",
  "Adjust stock": "साठा बदला", "Edit product": "उत्पादन संपादित करा", "Hot seller": "जलद विक्री होणारे",
  "Frequently bought together": "एकत्र खरेदी होणाऱ्या वस्तू", "Recent stock changes": "साठ्यातील अलीकडील बदल",
  "Quick stock update": "साठ्यात त्वरित बदल", "Current stock:": "सध्याचा साठा:",
  "Units to add or remove": "जोडायची किंवा कमी करायची युनिट्स", "New delivery": "नवीन माल",
  "Customer return": "ग्राहकाकडून परत", "Damaged / expired": "नुकसान झालेले / मुदत संपलेले",
  "Stock count correction": "साठा मोजणी दुरुस्ती", "Save stock update": "साठ्यातील बदल जतन करा",
  "units": "युनिट्स", "balance": "शिल्लक साठा", "shared bills": "सामायिक बिले"
});
Object.assign(extraLanguageCopy.hi, {
  "LOCAL WEATHER": "स्थानीय मौसम", "Weather demand insights": "मौसम मांग जानकारी", "Store city": "दुकान का शहर",
  "Save location": "स्थान सहेजें", "Weather sensitivity": "मौसम संवेदनशीलता", "No weather category": "कोई मौसम श्रेणी नहीं",
  "Hot weather": "गर्म मौसम", "Rainy weather": "बरसाती मौसम", "Cold weather": "ठंडा मौसम",
  "Set your store location": "अपनी दुकान का स्थान चुनें", "Set a location to load weather.": "मौसम देखने के लिए स्थान चुनें।",
  "Weather is optional; the sales and inventory dashboard remains available.": "मौसम वैकल्पिक है; बिक्री और भंडार डैशबोर्ड उपलब्ध रहेगा।",
  "No matching weather-sensitive products or demand signals for this forecast.": "इस अनुमान के लिए मौसम-संवेदनशील उत्पाद या मांग संकेत नहीं मिले।"
});
Object.assign(extraLanguageCopy.mr, {
  "LOCAL WEATHER": "स्थानिक हवामान", "Weather demand insights": "हवामानानुसार मागणी माहिती", "Store city": "दुकानाचे शहर",
  "Save location": "स्थान जतन करा", "Weather sensitivity": "हवामान संवेदनशीलता", "No weather category": "हवामान श्रेणी नाही",
  "Hot weather": "उष्ण हवामान", "Rainy weather": "पावसाळी हवामान", "Cold weather": "थंड हवामान",
  "Set your store location": "दुकानाचे स्थान निवडा", "Set a location to load weather.": "हवामान पाहण्यासाठी स्थान निवडा.",
  "Weather is optional; the sales and inventory dashboard remains available.": "हवामान ऐच्छिक आहे; विक्री आणि साठा डॅशबोर्ड उपलब्ध राहील.",
  "No matching weather-sensitive products or demand signals for this forecast.": "या अंदाजासाठी हवामान-संवेदनशील उत्पादने किंवा मागणी संकेत आढळले नाहीत."
});
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

function renderWeather(data) {
  state.weather = data;
  if (!$("weatherCurrent")) return;
  const current = $("weatherCurrent"), days = $("weatherForecast"), insights = $("weatherProductInsights");
  current.replaceChildren(); days.replaceChildren(); insights.replaceChildren();
  $("weatherSource").textContent = data.available ? `${data.city || "Store"} · ${data.source}${data.cached ? " · cached" : ""}` : (data.configured ? "WEATHER OFFLINE" : "NO LOCATION");
  $("weatherPulse").textContent = data.available ? `${data.current.conditions} · ${data.current.temperature_c}°C` : (data.message || "Set your store location");
  $("weatherPulseNote").textContent = data.available ? `${data.city} · humidity ${data.current.humidity_percent ?? "—"}% · rain ${data.current.precipitation_mm ?? "—"} mm` : "Weather is optional; the sales and inventory dashboard remains available.";
  if (!data.available) {
    current.append(element("div", "empty-state", data.message || "Weather is unavailable. No values were substituted."));
    $("weatherTimestamp").textContent = "No current weather data available.";
    applyLanguage(); return;
  }
  $("weatherCity").value = data.city || "";
  current.append(element("div", "weather-current-main", `${data.current.conditions} · ${data.current.temperature_c}°C`),
    element("small", "", `Humidity ${data.current.humidity_percent ?? "—"}% · precipitation ${data.current.precipitation_mm ?? "—"} mm · observed ${data.current.time || "time unavailable"}`));
  for (const day of (data.forecast || []).slice(0, 7)) {
    days.append(element("article", "weather-day", `${day.date.slice(5)} · ${day.conditions}\n${day.temperature_min_c ?? "—"}–${day.temperature_max_c ?? "—"}°C · ${day.precipitation_mm ?? "—"} mm rain`));
  }
  if (!data.insights?.length) insights.append(element("div", "empty-state", "No matching weather-sensitive products or demand signals for this forecast."));
  for (const insight of data.insights || []) {
    const card = element("article", "weather-insight");
    card.append(element("b", "", insight.product), element("span", "", insight.impact), element("small", "", `${insight.explanation} ${insight.method === "rule_based_estimate" ? "Rule-based estimate · low confidence." : `Historical comparison · ${insight.confidence} confidence.`} Suggested stock review: ${insight.suggested_inventory_review} units.`));
    insights.append(card);
  }
  $("weatherTimestamp").textContent = `Source: ${data.source}. Retrieved ${data.fetched_at}. Historical weather-sales features: ${data.history_available ? "available where sample thresholds pass" : "not available; insights use labeled estimates"}.`;
  applyLanguage();
}

function addWeatherSensitivityControls() {
  for (const formId of ["productForm", "productEditForm"]) {
    const form = $(formId);
    if (!form || form.elements.weather_sensitivity) continue;
    const label = document.createElement("label");
    label.textContent = "Weather sensitivity";
    const select = document.createElement("select"); select.name = "weather_sensitivity";
    for (const [value, title] of [["none", "No weather category"], ["hot", "Hot weather"], ["rain", "Rainy weather"], ["cold", "Cold weather"]]) {
      const option = document.createElement("option"); option.value = value; option.textContent = title; select.append(option);
    }
    label.append(select);
    const target = form.querySelector(".product-extra .edit-grid") || form.querySelector(".product-extra") || form;
    target.append(label);
    for (const [name, title, type, min, step, value] of [
      ["supplier_min_order_quantity", "Supplier minimum order (units)", "number", "1", "1", "1"],
      ["minimum_gross_margin_percent", "Minimum gross margin (%)", "number", "0", "0.1", "5"]
    ]) {
      const field = document.createElement("label"); field.textContent = title;
      const input = document.createElement("input"); input.name = name; input.type = type; input.min = min; input.step = step; input.max = name === "minimum_gross_margin_percent" ? "95" : "1000000"; input.value = value;
      field.append(input); target.append(field);
    }
  }
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
  const revenueHeading = document.querySelector(".metric-grid .metric-card:first-child .metric-head span");
  if (revenueHeading) revenueHeading.textContent = "TOTAL SALES REVENUE";
  $("metricRevenue").textContent = money(data.total_sales_revenue ?? data.revenue_14d);
  $("metricUnits").textContent = fmt(data.units_14d);
  $("metricProducts").textContent = fmt(data.product_count);
  $("metricLowStock").textContent = fmt(data.low_stock_count);
  $("metricRevenueNote").textContent = data.total_units_sold ? `${fmt(data.total_units_sold)} units across saved sales` : "Add a sale to begin tracking revenue";

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
  chart.parentElement.querySelector(".chart-y span")?.replaceChildren(document.createTextNode(money(maxRevenue)));
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
  const assessment = state.insights.find((row) => row.product_id === product.id)?.stock_risk;
  const days = product.stock / Math.max(product.daily_demand, 0.1);
  const lead = Number(product.supplier_lead_time_days ?? 3);
  return { days: assessment?.days_of_cover ?? days, level: assessment?.level || (days < lead ? "high" : days < lead + 4 ? "medium" : "low") };
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
    if (product.manufacturing_date) name.append(element("small", "subcell", `MFG ${product.manufacturing_date}`));
    if (product.expiry_date) name.append(element("small", "subcell", `EXP ${product.expiry_date}`));
    if (product.hsn_code || product.gst_rate_percent != null) name.append(element("small", "subcell", `${product.hsn_code ? `HSN ${product.hsn_code}` : ""}${product.hsn_code && product.gst_rate_percent != null ? " · " : ""}${product.gst_rate_percent != null ? `GST ${product.gst_rate_percent}%` : ""}`));
    const stock = element("td", "", fmt(product.stock));
    const demand = element("td", "", `${fmt(product.daily_demand)} units`);
    const cover = element("td", "", `${fmt(risk.days)} days`);
    const lead = element("td", "", `${fmt(product.supplier_lead_time_days ?? 3)} days`);
    const holding = element("td", "", `${money(product.holding_cost_per_unit_day ?? 0.5)} / unit / day`);
    const status = element("td");
    status.append(element("span", `risk-pill risk-${risk.level === "critical" ? "critical" : risk.level === "high" ? "high" : risk.level === "medium" ? "med" : "low"}`, riskLabel(risk.level)));
    const price = element("td", "", `${money(product.selling_price)} / ${money(product.unit_cost)}`);
    const actions = element("td");
    const actionWrap = element("div", "row-actions");
    const adjust = element("button", "", "Adjust stock");
    adjust.type = "button";
    adjust.addEventListener("click", () => openStockAdjustment(product));
    const edit = element("button", "", "Edit product");
    edit.type = "button";
    edit.addEventListener("click", () => editProduct(product));
    const report = element("button", "", "Log stockout");
    report.type = "button";
    report.addEventListener("click", () => openStockoutDialog(product));
    const remove = element("button", "delete-action", "Delete");
    remove.type = "button";
    remove.addEventListener("click", () => deleteProduct(product));
    actionWrap.append(adjust, edit, report, remove);
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
  const hotPanel = $("bestSellers").closest(".movers-panel");
  if (hotPanel) {
    hotPanel.querySelector("h2").textContent = "Hot selling products";
    hotPanel.querySelector(".panel-title p").textContent = "Ranked by all-time sales revenue, with proven basket links highlighted.";
  }
  for (const [id, sourceRows] of [["bestSellers", state.analytics.sales_by_product || state.analytics.best_sellers_90d], ["lowestSellers", state.analytics.lowest_sellers_90d]]) {
    let rows = sourceRows;
    if (id === "bestSellers" && state.analytics.sales_by_product) {
      const topRows = sourceRows.slice(0, 10);
      const pairedNames = new Set((state.bundles?.hot_selling_products || []).map((row) => row.product));
      rows = [...new Map([...topRows, ...sourceRows.filter((row) => pairedNames.has(row.product))].map((row) => [row.product, row])).values()];
    }
    const list = $(id);
    list.replaceChildren();
    if (!rows.length) {
      list.append(element("div", "empty-state", "No products in inventory yet."));
      continue;
    }
    const revenueRanked = id === "bestSellers" && Boolean(state.analytics.sales_by_product);
    const maxMetric = Math.max(1, ...rows.map((row) => revenueRanked ? row.revenue : row.units));
    const basketHot = new Map((state.bundles?.hot_selling_products || []).map((row) => [row.product, row]));
    rows.forEach((row, index) => {
      const item = element("div", "rank-row");
      const name = element("div", "rank-name", row.product);
      const bar = element("div", "rank-bar");
      const fill = element("i");
      fill.style.width = `${(revenueRanked ? row.revenue : row.units) / maxMetric * 100}%`;
      bar.append(fill);
      name.append(bar);
      const association = basketHot.get(row.product);
      if (revenueRanked && row.units > 0) name.append(element("small", "hot-seller-tag", "Hot seller"));
      if (association) name.append(element("small", "hot-basket-tag", `Often bought with ${association.related_products.join(", ")} · ${association.shared_bills} shared bills`));
      item.append(element("span", "rank-number", String(index + 1)), name);
      const meta = element("div", "rank-meta");
      meta.append(element("b", "", `${fmt(row.units)} units`), element("small", "", money(row.revenue)));
      item.append(meta);
      list.append(item);
    });
  }
  applyLanguage();
}

async function openStockAdjustment(product) {
  const form = $("stockAdjustForm");
  if (!form || !$("stockAdjustDialog")) {
    if (!product) {
      const selectedName = window.prompt(`Choose a product to update:\n${state.products.map((item) => item.name).join(", ")}`);
      product = state.products.find((item) => item.name.toLocaleLowerCase() === (selectedName || "").trim().toLocaleLowerCase());
      if (!product) return;
    }
    const rawUnits = window.prompt(`Current stock for ${product.name}: ${product.stock}\nEnter units to add, or a negative number to remove:`);
    if (rawUnits === null) return;
    const changeUnits = Number(rawUnits);
    if (!Number.isInteger(changeUnits) || changeUnits === 0) return toast("Enter a non-zero whole number of units.", true);
    const reason = window.prompt("Reason for this stock change:", changeUnits > 0 ? "delivery" : "damage");
    if (reason === null || !reason.trim()) return;
    try {
      const result = await api(`/api/products/${product.id}/stock-adjustments`, { method: "POST", body: JSON.stringify({ change_units: changeUnits, reason: reason.trim() }) });
      showInlineMessage("inventoryMessage", `${result.product}: ${result.message}`);
      toast(`${result.product}: ${result.message}`);
      await refresh();
    } catch (error) { showInlineMessage("inventoryMessage", error.message, true); toast(error.message, true); }
    return;
  }
  const select = form.elements.stockAdjustProductSelect;
  if (select) {
    select.replaceChildren(...state.products.map((item) => {
      const option = element("option", "", `${item.name.trim()} · ${fmt(item.stock)} in stock`);
      option.value = String(item.id);
      return option;
    }));
    select.value = String(product?.id || state.products[0]?.id || "");
    product = state.products.find((item) => String(item.id) === select.value);
  }
  if (!product) return toast("Add a product before updating stock.", true);
  form.elements.product_id.value = product.id;
  form.elements.change_units.value = "";
  form.elements.reason.value = "delivery";
  $("stockAdjustTitle").textContent = `Adjust ${product.name.trim()}`;
  $("stockAdjustCurrent").textContent = fmt(product.stock);
  showInlineMessage("stockAdjustMessage", "");
  $("stockAdjustDialog").showModal();
}

function renderStockAdjustments() {
  const list = $("stockAdjustmentHistory");
  if (!list) return;
  list.replaceChildren();
  if (!state.stockAdjustments.length) {
    list.append(element("span", "empty-state", "No stock changes recorded yet."));
    return;
  }
  for (const movement of state.stockAdjustments) {
    const row = element("div", "movement-row");
    const amount = movement.change_units > 0 ? `+${movement.change_units}` : String(movement.change_units);
    row.append(element("b", "", movement.product), element("span", movement.change_units > 0 ? "movement-in" : "movement-out", `${amount} units`),
      element("small", "", `${movement.reason} · balance ${movement.stock_after} · ${new Date(movement.created_at).toLocaleString(locale(), { dateStyle: "short", timeStyle: "short" })}`));
    list.append(row);
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
  if ($("competitorPrice")?.value) params.set("competitor_price", $("competitorPrice").value);
  if ($("temperature").value !== "") params.set("temperature_c", $("temperature").value);
  if ($("rain").value !== "") params.set("rain_mm", $("rain").value);
  const button = $("forecastForm").querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Building forecast…";
  try {
    const data = await api(`/api/forecast/${id}?${params}`);
    renderForecast(data);
  } catch (error) {
    const output = $("forecastOutput");
    output.replaceChildren(element("div", "forecast-empty error", "Forecast could not be built: " + error.message));
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
  price.append(element("span", "", "DEMAND-AWARE PRICE"), element("b", "", money(data.pricing.suggested_price)), element("small", "", `${data.pricing.suggested_gross_margin_percent ?? data.pricing.gross_margin}% gross margin · current ${money(data.pricing.current_price)} · projected profit ${money(data.pricing.suggested_horizon_gross_profit ?? 0)}`));
  grid.append(price);
  const seasonal = (data.seasonal_context || []).join(", ") || "No seasonal uplift";
  const festivals = (data.festival_events || []).join(", ") || "No major festival in this horizon";
  const weather = data.weather.temperature_c === null && data.weather.rain_mm === null
    ? "No local weather adjustment supplied"
    : `${data.weather.temperature_c ?? "—"}°C · ${data.weather.rain_mm ?? "—"} mm rain · factor ${data.weather.adjustment}`;
  const explanation = (data.explanation || []).join(". ") || "Seasonal baseline estimate";
  const selectedMethod = data.model?.model || "Seasonal baseline";
  const evaluation = data.model?.evaluation;
  const modelSummary = evaluation
    ? `Holdout MAE ${evaluation.mae} units/day vs seven-day seasonal MAE ${evaluation.baseline_mae}; mean-baseline MAE ${evaluation.mean_baseline_mae}; RMSE ${evaluation.rmse}${evaluation.wape_percent === null ? "" : `; WAPE ${evaluation.wape_percent}%`}.`
    : (data.model?.reason || "Model evaluation needs more recorded sales history.");
  const drivers = (data.model?.feature_importance || []).slice(0, 4)
    .map((item) => `${item.feature} (importance ${Number(item.importance).toFixed(3)})`).join(", ") || "No trained-model feature ranking yet";
  const detailList = [
    ["CALENDAR SIGNALS", `${seasonal}. ${festivals}`],
    ["WEATHER INPUT", weather],
    ["SUPPLIER & HOLDING COST", `${fmt(data.supplier_lead_time_days)} day supplier lead · ${money(data.holding_cost.per_unit_per_day)} per unit/day · current carrying cost ${money(data.holding_cost.current_inventory_per_day)}/day · excess holding cost over horizon ${money(data.holding_cost.estimated_excess_cost_over_horizon)}`],
    ["REORDER POINT & SAFETY STOCK", `Reorder point ${fmt(data.reorder_recommendation?.reorder_point ?? data.stock_risk.reorder_point)} units = lead-time demand ${fmt(data.stock_risk.lead_time_demand)} + safety stock ${fmt(data.safety_stock_units)}. Supplier minimum order ${fmt(data.reorder_recommendation?.supplier_minimum_quantity ?? 1)}.`],
    ["STOCKOUT RISK FACTORS", (data.stock_risk.reasons || []).join(" ")],
    ["OVERSTOCK RISK FACTORS", (data.overstock_risk.reasons || []).join(" ")],
    ["PRICING & MARGIN FLOOR", `Minimum gross margin ${fmt(data.pricing.minimum_margin_percent)}%. Minimum price ${money(data.pricing.minimum_price)}. Current profit/unit ${money(data.pricing.current_profit_per_unit)}; suggested ${money(data.pricing.suggested_profit_per_unit)}. This suggestion does not change the saved price.`],
    ["PRICING CONTEXT", `${(data.pricing.explanation || []).join(" ")} ${data.pricing.profit_basis || "Projected profit holds forecast demand constant."}`],
    ["MODEL EVALUATION", `${modelSummary} Leading features: ${drivers}.`],
    ["WHY THIS RECOMMENDATION", explanation + ". Model used: " + selectedMethod + ". Confidence: " + data.confidence + "."]
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

function renderInventoryRecommendations() {
  const ids = ["stockoutRiskList", "overstockRiskList", "reorderAdviceList", "pricingAdviceList"];
  if (!$(ids[0])) return;
  const lists = Object.fromEntries(ids.map((id) => [id, $(id)]));
  for (const list of Object.values(lists)) list.replaceChildren();
  const ranked = [...state.insights].sort((a, b) => (b.stock_risk?.score || 0) - (a.stock_risk?.score || 0));
  const appendCard = (target, title, meta, detail, level = "low") => {
    const card = element("article", `risk-advice-card risk-advice-${level}`);
    card.append(element("b", "", title), element("span", "", meta), element("small", "", detail));
    target.append(card);
  };
  if (!ranked.length) {
    for (const list of Object.values(lists)) list.append(element("div", "empty-state", "Add inventory and sales to see product recommendations."));
    return;
  }
  for (const item of ranked) {
    const sr = item.stock_risk || {}, or = item.overstock_risk || {}, reorder = item.reorder_recommendation || {};
    appendCard(lists.stockoutRiskList, item.product, `${sr.level || "low"} · score ${sr.score || 0}/100 · ${fmt(sr.days_of_cover || 0)} days cover`,
      `${(sr.reasons || []).join(" ")} Reorder point ${fmt(sr.reorder_point || 0)}; safety stock ${fmt(sr.safety_stock || 0)}.`, sr.level || "low");
    appendCard(lists.overstockRiskList, item.product, `${or.level || "low"} · score ${or.score || 0}/100 · ${fmt(or.excess_units || 0)} excess units`,
      (or.reasons || []).join(" "), or.level || "low");
    appendCard(lists.reorderAdviceList, item.product,
      reorder.should_reorder ? `Order ${fmt(reorder.suggested_quantity)} units · ${fmt(reorder.expected_stock_coverage_days)} days after order` : "No reorder needed now",
      reorder.reason || "Sales and demand estimates determine the reorder point.", reorder.should_reorder ? (sr.level || "medium") : "low");
    const pricing = item.pricing || {};
    appendCard(lists.pricingAdviceList, item.product,
      `${money(pricing.suggested_price || 0)} suggested · ${fmt(pricing.suggested_gross_margin_percent ?? pricing.gross_margin)}% margin`,
      `${(pricing.explanation || []).join(" ")} Minimum-price floor: ${money(pricing.minimum_price || 0)}. Projected horizon gross profit ${money(pricing.suggested_horizon_gross_profit || 0)}. ${pricing.profit_basis || "Actual price remains unchanged."}`, "low");
  }
  applyLanguage();
}

function renderRetailActions(data) {
  const hot = $("expiryHotList");
  hot.replaceChildren();
  if (!data?.hot_list?.length) hot.append(element("div", "empty-state", "No products close to expiry."));
  for (const item of data?.hot_list || []) {
    const row = element("article", "retail-action-row");
    row.append(element("b", "", item.product));
    row.append(element("span", item.status === "expired" ? "risk-pill risk-high" : "risk-pill risk-med",
      item.status === "expired" ? "Expired · remove from sale" : "Sell before expiry"));
    row.append(element("small", "", (item.days_to_expiry < 0 ? "Expired" : "Expires") + " " + item.expiry_date + " · " + Math.abs(item.days_to_expiry) + " days"));
    if (item.status === "near_expiry") {
      row.append(element("small", "", item.at_risk_units + " units at risk"));
      row.append(element("strong", "clearance-price", item.discount_percent + "% markdown · " + money(item.suggested_price)));
      if (item.estimated_price_including_gst !== null) row.append(element("small", "", "Estimated price including GST: " + money(item.estimated_price_including_gst)));
    } else row.append(element("small", "", item.action));
    hot.append(row);
  }
  const dead = $("deadStockList");
  dead.replaceChildren();
  if (!data?.dead_stock?.length) dead.append(element("div", "empty-state", "No dead stock matched the current rule."));
  for (const item of data?.dead_stock || []) {
    const row = element("article", "retail-action-row");
    row.append(element("b", "", item.product));
    row.append(element("small", "", item.stock + " units · " + (item.idle_source === "never sold" ? "Never sold · " : "") + item.idle_days + " days since last sale"));
    row.append(element("small", "", "Carrying cost estimate: " + money(item.estimated_carrying_cost)));
    row.append(element("strong", "clearance-price", "Review price: " + money(item.review_price)));
    dead.append(row);
  }
  applyLanguage();
}

function renderBundles(data) {
  const bundleDescription = document.querySelector(".bundle-panel .panel-title p");
  if (bundleDescription) bundleDescription.textContent = "Products are suggested only when repeated bill-level purchase patterns support the relationship.";
  $("bundleMethod").textContent = data?.note || "Record the same bill ID on each sale line for customer-basket recommendations.";
  const list = $("bundleList");
  list.replaceChildren();
  if (!data?.recommendations?.length) {
    list.append(element("div", "empty-state", "Not enough co-purchase history yet. Record bill IDs across multiple sales."));
    applyLanguage();
    return;
  }
  for (const offer of data.recommendations) {
    const row = element("article", "bundle-row");
    row.append(element("b", "", offer.products.join(" + ")));
    row.append(element("small", "", offer.antecedent + " in bill → " + offer.consequent + " also present"));
    row.append(element("small", "", offer.co_purchase_baskets + " shared bills · support " + offer.support_percent + "% · confidence " + offer.confidence_percent + "% · lift " + offer.lift));
    list.append(row);
  }
  applyLanguage();
}

async function refresh() {
  $("refreshBtn").classList.add("spinning");
  try {
    addWeatherSensitivityControls();
    const loadResults = await Promise.allSettled([
      api("/api/health"), api("/api/dashboard"), api("/api/insights"), api("/api/sales?limit=12"), api("/api/analytics"), api("/api/festivals?days=120"), api("/api/stockouts?limit=20"), api("/api/retail-actions"), api("/api/bundles"), api("/api/stock-adjustments?limit=12"), api("/api/weather")
    ]);
    const [healthResult, dashboardResult, insightsResult, salesResult, analyticsResult, festivalsResult, stockoutsResult, actionsResult, bundlesResult, adjustmentsResult, weatherResult] = loadResults;
    if (dashboardResult.status === "rejected") throw dashboardResult.reason;
    const health = healthResult.status === "fulfilled" ? healthResult.value : null;
    const dashboard = dashboardResult.value;
    const insights = insightsResult.status === "fulfilled" ? insightsResult.value : { insights: [] };
    const sales = salesResult.status === "fulfilled" ? salesResult.value : [];
    const analytics = analyticsResult.status === "fulfilled" ? analyticsResult.value : null;
    const festivals = festivalsResult.status === "fulfilled" ? festivalsResult.value : { events: [] };
    const stockouts = stockoutsResult.status === "fulfilled" ? stockoutsResult.value : { events: [] };
    const retailActions = actionsResult.status === "fulfilled" ? actionsResult.value : { hot_list: [], dead_stock: [] };
    const bundles = bundlesResult.status === "fulfilled" ? bundlesResult.value : { recommendations: [], note: "Bundle insights are unavailable." };
    const adjustments = adjustmentsResult.status === "fulfilled" ? adjustmentsResult.value : { adjustments: [] };
    const weather = weatherResult.status === "fulfilled" ? weatherResult.value : { configured: false, available: false, message: "Weather service unavailable. Other dashboard data is unaffected.", forecast: [], insights: [] };
    setConnection(true);
    const failedLoads = loadResults.filter((result) => result.status === "rejected").length;
    if (failedLoads) toast(failedLoads + " optional dashboard data request(s) failed. Sales and forecasts remain available.", true);
    state.products = dashboard.products;
    state.insights = insights.insights;
    state.analytics = analytics;
    state.festivals = festivals.events;
    state.stockouts = stockouts.events;
    state.retailActions = retailActions;
    state.bundles = bundles;
    state.stockAdjustments = adjustments.adjustments;
    state.weather = weather;
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
    renderStockAdjustments();
    renderRetailActions(retailActions);
    renderBundles(bundles);
    renderWeather(weather);
    renderInventoryRecommendations();
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
  for (const key of ["manufacturing_date", "expiry_date", "hsn_code", "gst_rate_percent"]) if (form.elements[key]) form.elements[key].value = product[key] ?? "";
  form.elements.gst_price_inclusive.value = String(product.gst_price_inclusive !== false);
  if (form.elements.weather_sensitivity) form.elements.weather_sensitivity.value = product.weather_sensitivity || "none";
  form.elements.supplier_min_order_quantity.value = product.supplier_min_order_quantity || 1;
  form.elements.minimum_gross_margin_percent.value = product.minimum_gross_margin_percent ?? 5;
  if (form.elements.manufacturing_date) form.elements.manufacturing_date.max = product.expiry_date || "";
  if (form.elements.expiry_date) form.elements.expiry_date.min = product.manufacturing_date || "";
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
  const aliases = { sale_date: "date", product_name: "product", item: "product", qty: "quantity", unit_price: "price", stock_on_hand: "stock", mfg_date: "manufacturing_date", expiry: "expiry_date", bill_id: "transaction_id", invoice_id: "transaction_id", bill: "transaction_id", type: "record_type" };
  const headers = rows.shift().map((header) => {
    const normalized = header.trim().toLocaleLowerCase().replace(/^\ufeff/, "").replace(/[\s-]+/g, "_");
    return aliases[normalized] || normalized;
  });
  if (!rows.length) throw new Error("The CSV has headers but no rows.");
  if (new Set(headers).size !== headers.length) throw new Error("The CSV has duplicate column names.");
  if (rows.length > 5000) throw new Error("Import up to 5,000 rows at a time.");
  const asDate = (value, label, rowNumber) => {
    if (!value) return undefined;
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(NaN);
    if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`Invalid ${label} on CSV row ${rowNumber}. Use YYYY-MM-DD.`);
    return value;
  };
  if (headers.includes("record_type")) {
    const result = { products: [], sales: [] };
    rows.forEach((values, index) => {
      const item = Object.fromEntries(headers.map((header, column) => [header, values[column] || ""]));
      const type = item.record_type.trim().toLowerCase();
      const rowNumber = index + 2;
      if (type === "product") {
        if (!item.product.trim()) throw new Error(`Product row ${rowNumber} needs a product name.`);
        const product = { name: item.product.trim() };
        for (const [field, label] of [["stock", "stock"], ["daily_demand", "daily demand"], ["selling_price", "selling price"], ["unit_cost", "unit cost"], ["supplier_lead_time_days", "lead time"], ["holding_cost_per_unit_day", "holding cost"], ["gst_rate_percent", "GST rate"]]) {
          if (item[field] !== "") {
            const number = Number(item[field]);
            const whole = field === "stock" || field === "supplier_lead_time_days";
            const positive = field === "daily_demand" || field === "selling_price" || field === "unit_cost";
            if (!Number.isFinite(number) || (whole && !Number.isInteger(number)) || (positive ? number <= 0 : number < 0)) throw new Error(`Invalid ${label} on CSV row ${rowNumber}.`);
            product[field] = number;
          }
        }
        for (const field of ["manufacturing_date", "expiry_date", "inventory_since"]) {
          const value = asDate(item[field], field.replaceAll("_", " "), rowNumber);
          if (value) product[field] = value;
        }
        if (item.hsn_code) product.hsn_code = item.hsn_code.trim();
        if (item.gst_price_inclusive !== "") {
          const value = item.gst_price_inclusive.trim().toLowerCase();
          if (!["true", "false", "yes", "no", "1", "0"].includes(value)) throw new Error(`GST price basis must be true/false on CSV row ${rowNumber}.`);
          product.gst_price_inclusive = ["true", "yes", "1"].includes(value);
        }
        result.products.push(product);
      } else if (type === "sale") {
        const saleDate = asDate(item.date, "sale date", rowNumber);
        const quantity = Number(item.quantity), price = Number(item.price);
        if (!saleDate || !item.product.trim() || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) throw new Error(`Invalid sale row ${rowNumber}: add date, product, positive whole quantity, and price.`);
        result.sales.push({ sale_date: saleDate, product_name: item.product.trim(), quantity, price, transaction_id: (item.transaction_id || "").trim() || null });
      } else throw new Error(`CSV row ${rowNumber} needs record_type 'product' or 'sale'.`);
    });
    if (result.products.length > 1000) throw new Error("Import up to 1,000 product rows at a time.");
    if (!result.products.length && !result.sales.length) throw new Error("Add at least one product or sale row.");
    return result;
  }
  for (const required of ["date", "product", "quantity"]) if (!headers.includes(required)) throw new Error(`CSV needs a '${required}' column.`);
  if (!headers.includes("price") && !headers.includes("selling_price")) throw new Error("CSV needs a 'price' column.");
  return rows.map((values, index) => {
    const item = Object.fromEntries(headers.map((header, column) => [header, values[column] || ""]));
    const saleDate = asDate(item.date, "sale date", index + 2);
    const quantity = Number(item.quantity), price = Number(item.price || item.selling_price);
    if (!item.product || !saleDate || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(price) || price <= 0) {
      throw new Error(`Invalid date, product, quantity, or price on CSV row ${index + 2}.`);
    }
    return { sale_date: saleDate, product_name: item.product.trim(), quantity, price, transaction_id: (item.transaction_id || "").trim() || null };
  });
}

let pendingCsv = [];
const pendingCsvCount = () => Array.isArray(pendingCsv) ? pendingCsv.length : pendingCsv.products.length + pendingCsv.sales.length;

async function importCsv() {
  if (!pendingCsvCount()) return;
  const button = $("uploadCsvBtn");
  button.disabled = true;
  button.textContent = "Importing…";
  showInlineMessage("importMessage", "Importing sales and checking product names…");
  try {
    const storeFormat = !Array.isArray(pendingCsv);
    const result = await api(storeFormat ? "/api/import/store-csv" : "/api/sales/bulk", { method: "POST", body: JSON.stringify(storeFormat ? pendingCsv : { records: pendingCsv }) });
    const uploadedCount = pendingCsvCount();
    pendingCsv = [];
    $("csvFile").value = "";
    const createdNames = (result.products_added || []).map((item) => item.name);
    const details = result.already_imported
      ? result.message
      : `${result.records_added} sales rows imported; ${createdNames.length} products added and ${(result.products_updated || []).length} inventory records updated; ${result.stock_changes || 0} stock changes recorded. ${createdNames.length ? `New: ${createdNames.join(", ")}.` : ""}`;
    showInlineMessage("importMessage", details);
    toast(result.already_imported ? "This CSV was already imported; no duplicate data was added." : `${uploadedCount} CSV rows imported. Inventory, sales, and insights refreshed.`);
    await refresh();
  } catch (error) {
    showInlineMessage("importMessage", error.message, true);
  } finally {
    button.disabled = !pendingCsvCount();
    button.textContent = "Import rows";
    applyLanguage();
  }
}

function wireEvents() {
  const navItems = [...document.querySelectorAll(".nav-item")];
  const activateNav = (activeItem) => {
    navItems.forEach((item) => {
      const active = item === activeItem;
      item.classList.toggle("active", active);
      if (active) item.setAttribute("aria-current", "location");
      else item.removeAttribute("aria-current");
    });
  };
  for (const item of navItems) item.addEventListener("click", () => activateNav(item));
  let navFrame = 0;
  window.addEventListener("scroll", () => {
    if (navFrame) return;
    navFrame = requestAnimationFrame(() => {
      navFrame = 0;
      const targets = navItems.map((item) => {
        const href = item.getAttribute("href");
        const target = href === "#top" ? document.querySelector(".welcome-row") : document.querySelector(href);
        return { item, target, top: target?.getBoundingClientRect().top ?? Infinity, bottom: target?.getBoundingClientRect().bottom ?? -Infinity };
      }).filter((entry) => entry.target && entry.bottom > 76);
      if (!targets.length) return;
      const threshold = window.innerHeight * 0.32;
      const passed = targets.filter((entry) => entry.top <= threshold);
      const active = passed.length
        ? passed.reduce((best, entry) => entry.top > best.top ? entry : best)
        : targets.reduce((best, entry) => entry.top < best.top ? entry : best);
      activateNav(active.item);
    });
  }, { passive: true });
  window.addEventListener("hashchange", () => {
    const active = navItems.find((item) => item.getAttribute("href") === location.hash);
    if (active) activateNav(active);
  });
  addWeatherSensitivityControls();
  if (!$("competitorPrice")) {
    const label = document.createElement("label"); label.textContent = "Competitor price";
    const input = document.createElement("input"); input.id = "competitorPrice"; input.type = "number"; input.min = "0.01"; input.step = "0.01"; input.placeholder = "Optional ₹ price";
    label.append(input); $("forecastForm").insertBefore(label, $("forecastForm").querySelector("button[type=submit]"));
  }
  if (!$("stockoutRiskList")) {
    const inventory = $("inventory");
    if (inventory) inventory.insertAdjacentHTML("beforebegin", '<section class="content-grid inventory-recommendations" aria-label="Inventory risk recommendations"><article class="panel"><div class="panel-title"><div><span class="overline">REPLENISHMENT RISK</span><h2>Stockout risk</h2><p>Lead-time demand, variability, and reorder points.</p></div></div><div id="stockoutRiskList" class="risk-advice-list"></div></article><article class="panel"><div class="panel-title"><div><span class="overline">CARRYING RISK</span><h2>Overstock risk</h2><p>Forecast coverage, sales velocity, and holding exposure.</p></div></div><div id="overstockRiskList" class="risk-advice-list"></div></article><article class="panel"><div class="panel-title"><div><span class="overline">ACTIONABLE ORDER PLAN</span><h2>Reorder recommendations</h2><p>Order quantities respect each supplier minimum.</p></div></div><div id="reorderAdviceList" class="risk-advice-list"></div></article><article class="panel"><div class="panel-title"><div><span class="overline">MARGIN-AWARE PRICING</span><h2>Pricing advisor</h2><p>Suggestions are optional and never change your saved prices.</p></div></div><div id="pricingAdviceList" class="risk-advice-list"></div></article></section>');
  }
  $("weatherLocationForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const latitude = $("weatherLatitude").value, longitude = $("weatherLongitude").value;
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await api("/api/weather/location", { method: "PUT", body: JSON.stringify({ city: $("weatherCity").value.trim(),
        latitude: latitude === "" ? null : Number(latitude), longitude: longitude === "" ? null : Number(longitude) }) });
      showInlineMessage("weatherLocationMessage", "Store location saved. Weather insights are refreshed.");
      await refresh();
      toast("Store weather location saved.");
    } catch (error) { showInlineMessage("weatherLocationMessage", error.message, true); toast(error.message, true); }
    finally { button.disabled = false; }
  });
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
  const localToday = new Date();
  $("saleDate").value = localToday.getFullYear() + "-" + String(localToday.getMonth() + 1).padStart(2, "0") + "-" + String(localToday.getDate()).padStart(2, "0");
  $("saleForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const product = state.products.find((item) => String(item.id) === $("saleProduct").value);
    if (!product) return toast("Select a product first.", true);
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await api("/api/sales", { method: "POST", body: JSON.stringify({ product_name: product.name, sale_date: $("saleDate").value, quantity: Number($("saleQuantity").value), price: Number($("salePrice").value), transaction_id: $("saleTransactionId").value.trim() || null }) });
      const receipt = `Sale saved: ${$("saleQuantity").value} ${product.name} on ${$("saleDate").value}. Forecasts refreshed.`;
      showInlineMessage("saleMessage", receipt);
      toast("Sale recorded and forecasts refreshed.");
      $("saleQuantity").value = "1";
      await refresh();
    } catch (error) { showInlineMessage("saleMessage", error.message, true); toast(error.message, true); }
    finally { button.disabled = false; }
  });
  for (const form of [$("productForm"), $("productEditForm")]) {
    const manufacturing = form.elements.manufacturing_date;
    const expiry = form.elements.expiry_date;
    if (manufacturing && expiry) {
      manufacturing.addEventListener("change", () => { expiry.min = manufacturing.value; });
      expiry.addEventListener("change", () => { manufacturing.max = expiry.value; });
    }
  }
  $("addProductBtn").addEventListener("click", () => $("productFormWrap").classList.toggle("hidden"));
  const updateStockButton = element("button", "button button-outline", "Update stock");
  updateStockButton.id = "updateStockBtn";
  updateStockButton.type = "button";
  $("addProductBtn").after(updateStockButton);
  updateStockButton.addEventListener("click", () => openStockAdjustment());
  const adjustForm = $("stockAdjustForm");
  if (adjustForm && !adjustForm.elements.stockAdjustProductSelect) {
    const label = element("label", "", "Product");
    const select = document.createElement("select");
    select.name = "stockAdjustProductSelect";
    select.required = true;
    label.append(select);
    $("stockAdjustCurrent").closest(".stock-current").before(label);
    select.addEventListener("change", () => {
      const selected = state.products.find((product) => String(product.id) === select.value);
      if (!selected) return;
      adjustForm.elements.product_id.value = selected.id;
      $("stockAdjustTitle").textContent = `Adjust ${selected.name.trim()}`;
      $("stockAdjustCurrent").textContent = fmt(selected.stock);
    });
  }
  $("cancelProductBtn").addEventListener("click", () => $("productFormWrap").classList.add("hidden"));
  $("closeProductEditBtn").addEventListener("click", () => $("productEditDialog").close());
  $("cancelProductEditBtn").addEventListener("click", () => $("productEditDialog").close());
  $("closeStockoutBtn").addEventListener("click", () => $("stockoutDialog").close());
  $("cancelStockoutBtn").addEventListener("click", () => $("stockoutDialog").close());
  $("closeStockAdjustBtn")?.addEventListener("click", () => $("stockAdjustDialog").close());
  $("cancelStockAdjustBtn")?.addEventListener("click", () => $("stockAdjustDialog").close());
  $("stockAdjustForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const productId = Number(form.elements.product_id.value);
    const payload = { change_units: Number(form.elements.change_units.value), reason: form.elements.reason.value };
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const result = await api(`/api/products/${productId}/stock-adjustments`, { method: "POST", body: JSON.stringify(payload) });
      $("stockAdjustDialog").close();
      showInlineMessage("inventoryMessage", `${result.product}: ${result.message}`);
      toast(`${result.product}: ${result.message}`);
      await refresh();
    } catch (error) {
      showInlineMessage("stockAdjustMessage", error.message, true);
    } finally { button.disabled = false; }
  });
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
    for (const key of ["stock", "supplier_lead_time_days", "supplier_min_order_quantity"]) values[key] = Number(values[key]);
    for (const key of ["daily_demand", "holding_cost_per_unit_day", "selling_price", "unit_cost", "minimum_gross_margin_percent"]) values[key] = Number(values[key]);
    values.gst_rate_percent = values.gst_rate_percent === "" ? null : Number(values.gst_rate_percent);
    values.gst_price_inclusive = values.gst_price_inclusive === "true";
    values.hsn_code = values.hsn_code.trim() || null;
    if (form.elements.manufacturing_date) values.manufacturing_date = values.manufacturing_date || null;
    values.expiry_date = values.expiry_date || null;
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
    for (const key of ["stock", "supplier_lead_time_days", "supplier_min_order_quantity"]) values[key] = Number(values[key]);
    for (const key of ["daily_demand", "holding_cost_per_unit_day", "selling_price", "unit_cost", "minimum_gross_margin_percent"]) values[key] = Number(values[key]);
    values.gst_rate_percent = values.gst_rate_percent === "" ? null : Number(values.gst_rate_percent);
    values.gst_price_inclusive = values.gst_price_inclusive === "true";
    values.hsn_code = values.hsn_code.trim() || null;
    values.manufacturing_date = values.manufacturing_date || null;
    values.expiry_date = values.expiry_date || null;
    button.disabled = true;
    try {
      await api("/api/products", { method: "POST", body: JSON.stringify(values) });
      const name = values.name.trim();
      form.reset();
      form.elements.holding_cost_per_unit_day.value = "0";
      form.elements.supplier_min_order_quantity.value = "1";
      form.elements.minimum_gross_margin_percent.value = "5";
      form.elements.gst_price_inclusive.value = "true";
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
      const importedNames = Array.isArray(pendingCsv)
        ? pendingCsv.map((row) => row.product_name)
        : [...pendingCsv.products.map((row) => row.name), ...pendingCsv.sales.map((row) => row.product_name)];
      const newNames = [...new Set(importedNames.map((name) => name.trim().replace(/\s+/g, " ")))]
        .filter((name) => !present.has(name.toLocaleLowerCase("en")));
      const preview = Array.isArray(pendingCsv)
        ? `${pendingCsv.length} valid sales rows ready. ${newNames.length} new products will be added automatically${newNames.length ? `: ${newNames.join(", ")}` : "; all product names match existing inventory"}.`
        : `${pendingCsv.products.length} inventory rows and ${pendingCsv.sales.length} sales rows ready. Stock, expiry dates, and bill IDs will be imported, then insights recalculated.`;
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
  const demoCsvButton = element("button", "button button-outline", "Download feature demo CSV");
  demoCsvButton.type = "button";
  $("templateBtn").after(demoCsvButton);
  demoCsvButton.addEventListener("click", async () => {
    try {
      const response = await fetch("/static/sample_retail_store.csv");
      if (!response.ok) throw new Error("Feature demo CSV is unavailable.");
      const source = await response.text();
      const localToday = new Date();
      const targetUtc = Date.UTC(localToday.getFullYear(), localToday.getMonth(), localToday.getDate());
      const sampleUtc = Date.UTC(2026, 10, 2);
      const dayShift = Math.round((targetUtc - sampleUtc) / 86400000);
      const freshSample = source.replace(/\b2026-\d{2}-\d{2}\b/g, (value) => {
        const sampleDate = new Date(`${value}T00:00:00Z`);
        sampleDate.setUTCDate(sampleDate.getUTCDate() + dayShift);
        return sampleDate.toISOString().slice(0, 10);
      });
      const blobUrl = URL.createObjectURL(new Blob([freshSample], { type: "text/csv;charset=utf-8" }));
      const link = element("a"); link.href = blobUrl; link.download = "retailai_feature_demo.csv"; link.click(); URL.revokeObjectURL(blobUrl);
      showInlineMessage("importMessage", "Feature demo CSV downloaded. Upload it to populate inventory, stock changes, expiry alerts, sales, and basket insights.");
      toast("Feature demo CSV downloaded.");
    } catch (error) { showInlineMessage("importMessage", error.message, true); }
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
  renderStockAdjustments();
  renderRetailActions(state.retailActions);
  renderBundles(state.bundles);
  setFestivalPlanDefaults();
}

document.addEventListener("DOMContentLoaded", () => {
  $("today").textContent = new Date().toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  $("productForm").elements.holding_cost_per_unit_day.value = "0";
  wireEvents();
  applyLanguage();
  refresh();
});
