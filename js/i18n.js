(function (root) {
    "use strict";

    var STORE_KEY = "olrd.lang";
    var doc = root.document;
    var subscribers = [];

    var dictionary = {
        en: {
            "nav.streamers": "Streamers",
            "nav.story": "Story Book",
            "nav.home": "Home",
            "footer.credit": "Created By ZB2T",
            "footer.note": "OLRD Streamers · Official Platform",
            "splash.tag": "Official Broadcast Platform",
            "hub.eyebrow": "The OLRD Collective",
            "hub.title": "Select A <span class=\"accent\">Wing</span>",
            "tile.streamers": "Streamers",
            "tile.streamers.desc": "Live Channels · Kick Roster",
            "tile.story": "Story Book",
            "tile.story.desc": "One Volume · Many Pages",
            "tile.enter": "Enter",
            "streamers.eyebrow": "Live Roster · Kick",
            "streamers.title": "OLRD <span class=\"accent\">Streamers</span>",
            "streamers.meta": "Channels On The Wall",
            "card.standby": "Signal Standby",
            "card.enter": "Enter",
            "card.live": "Live",
            "card.offline": "Offline",
            "card.closed": "Closed",
            "card.watching": "watching",
            "card.scanning": "Scanning the roster…",
            "empty.streamers": "The roster is being redrawn. Return shortly.",
            "story.eyebrow": "The Archive",
            "story.title": "Story <span class=\"accent\">Book</span>",
            "story.meta": "The Record Of The OLRD",
            "book.eyebrow": "OLRD Archive",
            "book.open": "Open The Book",
            "book.close": "Close Book",
            "book.by": "By",
            "book.page": "Page",
            "book.pages": "Pages",
            "book.prev": "Previous",
            "book.next": "Next",
            "book.contents": "Contents",
            "book.emptyPage": "This page is blank.",
            "book.emptyBook": "The book has no pages yet.",
            "admin.title": "Control",
            "admin.subtitle": "OLRD Management Console",
            "admin.accessKey": "Access Key",
            "admin.authorise": "Authorise",
            "admin.verifying": "Verifying",
            "admin.hint": "Authorised Personnel Only · Sessions End When This Tab Closes",
            "admin.lock": "Lock",
            "tab.streamers": "Streamers",
            "tab.story": "Story Book",
            "tab.security": "Security",
            "panel.streamers.eyebrow": "Live Roster",
            "streamers.addPh": "Kick username — e.g. zb2t",
            "common.add": "Add",
            "common.remove": "Remove",
            "common.delete": "Delete",
            "streamers.dragHint": "Drag rows by the handle to reorder the wall. Changes save instantly.",
            "panel.story.eyebrow": "The Archive",
            "book.section": "The Book",
            "field.bookTitle": "Book Title",
            "field.author": "Author",
            "field.bookSubtitle": "Subtitle",
            "book.save": "Save Book",
            "pages.label": "Pages",
            "pages.add": "+ Add Page",
            "page.titlePh": "Page title",
            "page.bodyPh": "Write this page… blank lines separate paragraphs.",
            "admin.empty.streamers": "No broadcasters on the wall. Add one above.",
            "admin.empty.pages": "No pages yet. Add the first one.",
            "panel.security.eyebrow": "Vault",
            "security.title": "Security",
            "security.changeTitle": "Change Access Key",
            "security.changeSub": "The key is never stored in readable form — only an irreversible salted fingerprint is kept. Choose something only you know.",
            "field.currentKey": "Current Key",
            "field.newKey": "New Key",
            "field.confirmKey": "Confirm New Key",
            "security.update": "Update Key",
            "security.toolsTitle": "Archive Tools",
            "security.toolsSub": "Export the full roster and book to a file you can back up or move to another machine. Import replaces everything currently stored.",
            "security.export": "Export Archive",
            "security.import": "Import Archive",
            "security.reset": "Discard Local Draft",
            "security.publishTitle": "Publish To Site",
            "security.publishSub": "Enter your publish key once to enable live publishing. After that, every change you make goes live for everyone automatically.",
            "field.publishKey": "Publish Key",
            "security.publishBtn": "Publish Now",
            "toast.order": "Order saved",
            "toast.added": "Broadcaster added",
            "toast.dup": "Already on the wall",
            "toast.invalidHandle": "Enter a valid handle",
            "toast.removed": "Broadcaster removed",
            "toast.pageAdded": "Page added",
            "toast.pageRemoved": "Page removed",
            "toast.pagesReordered": "Pages reordered",
            "toast.bookSaved": "Book saved",
            "toast.keyChanged": "Access key changed",
            "toast.exported": "Archive exported",
            "toast.imported": "Archive imported",
            "toast.importErr": "Invalid archive file",
            "toast.restored": "Restored to seed",
            "confirm.removePage": "Remove this page permanently?",
            "confirm.reset": "Discard your local draft and revert to the published version?",
            "msg.enterKey": "Enter the access key.",
            "msg.deriving": "Deriving key…",
            "msg.denied": "Access denied.",
            "msg.attempts": "{n} attempts before lockout.",
            "msg.attempt": "{n} attempt before lockout.",
            "msg.locked": "Too many attempts. Locked for {n}s.",
            "msg.lockCleared": "Lockout cleared. You may try again.",
            "msg.keyMismatch": "New keys do not match.",
            "msg.updating": "Updating",
            "msg.curWrong": "Current key is incorrect.",
            "msg.tooShort": "New key is too short.",
            "msg.mustDiffer": "New key must differ from the old one.",
            "msg.storeFail": "Could not store the new key.",
            "msg.keyUpdated": "Access key updated.",
            "msg.publishing": "Publishing…",
            "msg.published": "Published. Everyone sees it within a few seconds.",
            "msg.publishFail": "Publish failed — check your publish key and your connection.",
            "msg.publishKeyNeeded": "Enter your publish key.",
            "msg.publishNotSet": "Set your Supabase keys in config.js first.",
            "msg.cloudFail": "Couldn't reach the cloud to update your key. Check your connection and retry.",
            "pdf.attach": "Attach PDF",
            "pdf.replace": "Replace PDF",
            "pdf.remove": "Remove PDF",
            "pdf.attached": "PDF attached",
            "pdf.hint": "Attach a PDF to show it on this page instead of text.",
            "pdf.uploading": "Uploading PDF…",
            "pdf.uploaded": "PDF uploaded.",
            "pdf.uploadFail": "PDF upload failed.",
            "pdf.removed": "PDF removed.",
            "pdf.notPdf": "Please choose a PDF file.",
            "pdf.tooLarge": "PDF is too large (max 6 MB).",
            "book.pdfLoading": "Loading PDF…",
            "book.pdfMissing": "PDF not available.",
            "book.pdfOpen": "Open in new tab"
        },
        ar: {
            "nav.streamers": "الستريمرز",
            "nav.story": "الكتاب",
            "nav.home": "الرئيسية",
            "footer.credit": "صُنع بواسطة ZB2T",
            "footer.note": "OLRD Streamers · المنصّة الرسمية",
            "splash.tag": "منصّة البث الرسمية",
            "hub.eyebrow": "تجمّع OLRD",
            "hub.title": "اختر <span class=\"accent\">القسم</span>",
            "tile.streamers": "الستريمرز",
            "tile.streamers.desc": "قنوات مباشرة · قائمة Kick",
            "tile.story": "الكتاب",
            "tile.story.desc": "مجلّد واحد · صفحات عديدة",
            "tile.enter": "ادخل",
            "streamers.eyebrow": "القائمة المباشرة · Kick",
            "streamers.title": "<span class=\"accent\">ستريمرز</span> OLRD",
            "streamers.meta": "قناة على الجدار",
            "card.standby": "بانتظار الإشارة",
            "card.enter": "ادخل",
            "card.live": "مباشر",
            "card.offline": "غير متصل",
            "card.closed": "مغلق",
            "card.watching": "مشاهد",
            "card.scanning": "جارٍ فحص القائمة…",
            "empty.streamers": "يُعاد رسم القائمة، عُد بعد قليل.",
            "story.eyebrow": "الأرشيف",
            "story.title": "كتاب <span class=\"accent\">الحكايات</span>",
            "story.meta": "سِجلّ OLRD",
            "book.eyebrow": "أرشيف OLRD",
            "book.open": "افتح الكتاب",
            "book.close": "إغلاق الكتاب",
            "book.by": "بقلم",
            "book.page": "صفحة",
            "book.pages": "صفحات",
            "book.prev": "السابق",
            "book.next": "التالي",
            "book.contents": "المحتويات",
            "book.emptyPage": "هذه الصفحة فارغة.",
            "book.emptyBook": "لا صفحات في الكتاب بعد.",
            "admin.title": "التحكّم",
            "admin.subtitle": "لوحة إدارة OLRD",
            "admin.accessKey": "مفتاح الدخول",
            "admin.authorise": "دخول",
            "admin.verifying": "جارٍ التحقق",
            "admin.hint": "للمصرّح لهم فقط · تنتهي الجلسة بإغلاق التبويب",
            "admin.lock": "قفل",
            "tab.streamers": "الستريمرز",
            "tab.story": "الكتاب",
            "tab.security": "الأمان",
            "panel.streamers.eyebrow": "القائمة المباشرة",
            "streamers.addPh": "اسم مستخدم Kick — مثال zb2t",
            "common.add": "إضافة",
            "common.remove": "إزالة",
            "common.delete": "حذف",
            "streamers.dragHint": "اسحب الصفوف من المقبض لإعادة الترتيب، ويُحفظ فوراً.",
            "panel.story.eyebrow": "الأرشيف",
            "book.section": "الكتاب",
            "field.bookTitle": "عنوان الكتاب",
            "field.author": "المؤلّف",
            "field.bookSubtitle": "العنوان الفرعي",
            "book.save": "حفظ الكتاب",
            "pages.label": "الصفحات",
            "pages.add": "+ إضافة صفحة",
            "page.titlePh": "عنوان الصفحة",
            "page.bodyPh": "اكتب هذه الصفحة… الأسطر الفارغة تفصل الفقرات.",
            "admin.empty.streamers": "لا مذيعين في القائمة. أضف واحداً بالأعلى.",
            "admin.empty.pages": "لا صفحات بعد. أضف الأولى.",
            "panel.security.eyebrow": "الخزنة",
            "security.title": "الأمان",
            "security.changeTitle": "تغيير مفتاح الدخول",
            "security.changeSub": "لا يُخزَّن المفتاح بصيغة مقروءة أبداً — تُحفظ بصمة مملّحة لا يمكن عكسها. اختر ما تعرفه أنت وحدك.",
            "field.currentKey": "المفتاح الحالي",
            "field.newKey": "المفتاح الجديد",
            "field.confirmKey": "تأكيد المفتاح الجديد",
            "security.update": "تحديث المفتاح",
            "security.toolsTitle": "أدوات الأرشيف",
            "security.toolsSub": "صدّر كامل القائمة والكتاب إلى ملف للنسخ الاحتياطي أو النقل لجهاز آخر. الاستيراد يستبدل كل ما هو مخزّن حالياً.",
            "security.export": "تصدير الأرشيف",
            "security.import": "استيراد الأرشيف",
            "security.reset": "تجاهل المسودّة المحلية",
            "security.publishTitle": "النشر إلى الموقع",
            "security.publishSub": "أدخل مفتاح النشر مرّة واحدة لتفعيل النشر المباشر. بعدها يُنشَر كل تعديل للجميع تلقائياً.",
            "field.publishKey": "مفتاح النشر",
            "security.publishBtn": "انشر الآن",
            "toast.order": "حُفظ الترتيب",
            "toast.added": "أُضيف المذيع",
            "toast.dup": "موجود في القائمة مسبقاً",
            "toast.invalidHandle": "أدخل اسماً صالحاً",
            "toast.removed": "حُذف المذيع",
            "toast.pageAdded": "أُضيفت الصفحة",
            "toast.pageRemoved": "حُذفت الصفحة",
            "toast.pagesReordered": "أُعيد ترتيب الصفحات",
            "toast.bookSaved": "حُفظ الكتاب",
            "toast.keyChanged": "تغيّر مفتاح الدخول",
            "toast.exported": "صُدّر الأرشيف",
            "toast.imported": "استُورد الأرشيف",
            "toast.importErr": "ملف أرشيف غير صالح",
            "toast.restored": "استُعيدت البيانات الأصلية",
            "confirm.removePage": "حذف هذه الصفحة نهائياً؟",
            "confirm.reset": "تجاهل المسودّة المحلية والعودة إلى النسخة المنشورة؟",
            "msg.enterKey": "أدخل مفتاح الدخول.",
            "msg.deriving": "جارٍ اشتقاق المفتاح…",
            "msg.denied": "رُفض الدخول.",
            "msg.attempts": "{n} محاولات قبل القفل.",
            "msg.attempt": "محاولة {n} قبل القفل.",
            "msg.locked": "محاولات كثيرة. مقفل لمدة {n} ثانية.",
            "msg.lockCleared": "انتهى القفل، يمكنك المحاولة الآن.",
            "msg.keyMismatch": "المفتاحان غير متطابقين.",
            "msg.updating": "جارٍ التحديث",
            "msg.curWrong": "المفتاح الحالي غير صحيح.",
            "msg.tooShort": "المفتاح الجديد قصير جداً.",
            "msg.mustDiffer": "يجب أن يختلف المفتاح الجديد عن القديم.",
            "msg.storeFail": "تعذّر حفظ المفتاح الجديد.",
            "msg.keyUpdated": "تم تحديث مفتاح الدخول.",
            "msg.publishing": "جارٍ النشر…",
            "msg.published": "تم النشر. سيراه الجميع خلال ثوانٍ.",
            "msg.publishFail": "فشل النشر — تحقّق من مفتاح النشر واتصالك بالإنترنت.",
            "msg.publishKeyNeeded": "أدخل مفتاح النشر.",
            "msg.publishNotSet": "ضع مفاتيح Supabase في config.js أولاً.",
            "msg.cloudFail": "تعذّر الوصول إلى السحابة لتحديث المفتاح. تحقّق من اتصالك وأعد المحاولة.",
            "pdf.attach": "إرفاق PDF",
            "pdf.replace": "استبدال PDF",
            "pdf.remove": "إزالة",
            "pdf.attached": "ملف PDF مرفق",
            "pdf.hint": "أرفق ملف PDF ليظهر في هذه الصفحة بدل النص.",
            "pdf.uploading": "جارٍ رفع الـPDF…",
            "pdf.uploaded": "تم رفع الـPDF.",
            "pdf.uploadFail": "فشل رفع الـPDF.",
            "pdf.removed": "تمت إزالة الـPDF.",
            "pdf.notPdf": "اختر ملف PDF.",
            "pdf.tooLarge": "حجم الـPDF كبير جداً (الحد 6 ميغابايت).",
            "book.pdfLoading": "جارٍ تحميل الـPDF…",
            "book.pdfMissing": "الـPDF غير متاح.",
            "book.pdfOpen": "فتح في تبويب جديد"
        }
    };

    var lang = "en";
    try {
        var saved = root.localStorage.getItem(STORE_KEY);
        if (saved === "ar" || saved === "en") { lang = saved; }
    } catch (e) {}

    function t(key, vars) {
        var table = dictionary[lang] || dictionary.en;
        var value = table[key];
        if (value === undefined) { value = dictionary.en[key]; }
        if (value === undefined) { value = key; }
        if (vars) {
            Object.keys(vars).forEach(function (name) {
                value = value.replace("{" + name + "}", vars[name]);
            });
        }
        return value;
    }

    function applyDir() {
        if (!doc || !doc.documentElement) { return; }
        doc.documentElement.setAttribute("lang", lang);
        doc.documentElement.setAttribute("dir", "ltr");
    }

    function apply(scope) {
        var where = scope || doc;
        if (!where) { return; }
        var i, nodes;
        nodes = where.querySelectorAll("[data-i18n]");
        for (i = 0; i < nodes.length; i++) { nodes[i].textContent = t(nodes[i].getAttribute("data-i18n")); }
        nodes = where.querySelectorAll("[data-i18n-html]");
        for (i = 0; i < nodes.length; i++) { nodes[i].innerHTML = t(nodes[i].getAttribute("data-i18n-html")); }
        nodes = where.querySelectorAll("[data-i18n-ph]");
        for (i = 0; i < nodes.length; i++) { nodes[i].setAttribute("placeholder", t(nodes[i].getAttribute("data-i18n-ph"))); }
        if (doc) {
            nodes = doc.querySelectorAll("[data-lang]");
            for (i = 0; i < nodes.length; i++) { nodes[i].classList.toggle("is-active", nodes[i].getAttribute("data-lang") === lang); }
        }
    }

    function set(next) {
        if (next !== "en" && next !== "ar") { return; }
        if (next === lang) { return; }
        lang = next;
        try { root.localStorage.setItem(STORE_KEY, lang); } catch (e) {}
        applyDir();
        apply();
        for (var i = 0; i < subscribers.length; i++) {
            try { subscribers[i](lang); } catch (e) {}
        }
    }

    function subscribe(fn) {
        subscribers.push(fn);
        return function () {
            subscribers = subscribers.filter(function (f) { return f !== fn; });
        };
    }

    function bindSwitch() {
        if (!doc) { return; }
        doc.addEventListener("click", function (e) {
            var btn = e.target.closest ? e.target.closest("[data-lang]") : null;
            if (btn) { set(btn.getAttribute("data-lang")); }
        });
    }

    function boot() {
        applyDir();
        apply();
        bindSwitch();
    }

    applyDir();

    if (doc) {
        if (doc.readyState === "loading") {
            doc.addEventListener("DOMContentLoaded", boot);
        } else {
            boot();
        }
    }

    root.OLRD = root.OLRD || {};
    root.OLRD.i18n = {
        t: t,
        set: set,
        apply: apply,
        subscribe: subscribe,
        get: function () { return lang; }
    };

})(typeof self !== "undefined" ? self : this);
