function getCurrentLang() {
    return localStorage.getItem("mooden-lang") || document.documentElement.lang || "uk";
}

function formatDate(dateValue) {
    const lang = getCurrentLang();

    if (!dateValue) {
        return "—";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return dateValue;
    }

    return date.toLocaleDateString(
        lang === "en" ? "en-US" : "uk-UA",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}

function formatTime(timeValue) {
    if (!timeValue) {
        return "—";
    }

    return String(timeValue).slice(0, 5);
}

function getLocalDatePart(dateValue) {
    if (!dateValue) {
        return null;
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue).split("T")[0];
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function isLessonNow(item) {
    if (!item.lesson_date || !item.time_start || !item.time_end) {
        return false;
    }

    const datePart = getLocalDatePart(item.lesson_date);

    const startMatch = String(item.time_start).match(/^(\d{2}):(\d{2})/);
    const endMatch = String(item.time_end).match(/^(\d{2}):(\d{2})/);

    if (!datePart || !startMatch || !endMatch) {
        return false;
    }

    const now = new Date();

    const lessonStart = new Date(`${datePart}T${startMatch[0]}:00`);
    const lessonEnd = new Date(`${datePart}T${endMatch[0]}:00`);

    return now >= lessonStart && now <= lessonEnd;
}

function getLessonTypeText(type) {
    const lang = getCurrentLang();

    if (!type) {
        return "—";
    }

    const key = `course_detail.lesson_${type}`;
    const result = getTranslation(lang, key);

    return result === key ? type : result;
}