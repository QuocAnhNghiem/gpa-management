window.UsthTimetableScraper = (() => {
  const { cleanText, getLines, parseDateFromHeader, splitCourseTitle } = window.UsthErpNormalizer;

  function findDateHeaders() {
    return [...document.querySelectorAll('div, th, td, span')]
      .map((element) => ({
        element,
        date: parseDateFromHeader(element.innerText || element.textContent),
        rect: element.getBoundingClientRect(),
        text: cleanText(element.innerText || element.textContent),
      }))
      .filter(item => item.date && item.rect.width > 20 && item.rect.height > 10)
      .filter(item => item.text.length < 80 && (item.text.match(/\d{2}\.\d{2}\.\d{4}/g) || []).length === 1)
      .filter((item, index, list) => list.findIndex(other => other.date === item.date && Math.abs(other.rect.left - item.rect.left) < 8) === index);
  }

  function findClosestDate(cardRect, dateHeaders) {
    if (!dateHeaders.length) return '';
    const centerX = cardRect.left + cardRect.width / 2;
    const candidates = dateHeaders
      .filter(header => header.rect.top < cardRect.top)
      .map(header => ({ ...header, distance: Math.abs((header.rect.left + header.rect.width / 2) - centerX) }))
      .sort((a, b) => a.distance - b.distance);
    return candidates[0]?.date || '';
  }

  function findEventCards() {
    const nodes = [...document.querySelectorAll('div, article, section')];
    return nodes.filter((node) => {
      const text = cleanText(node.innerText || node.textContent);
      const timeMatches = text.match(/\(\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\)/g) || [];
      if (timeMatches.length !== 1) return false;
      if (!/[A-Z0-9.]{4,}\s+-\s+/.test(text)) return false;
      const rect = node.getBoundingClientRect();
      if (rect.width < 80 || rect.width > 420 || rect.height < 45 || rect.height > 220) return false;
      const childHasSamePattern = [...node.children].some(child => {
        const childText = cleanText(child.innerText || child.textContent);
        return childText !== text && /\(\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\)/.test(childText);
      });
      return !childHasSamePattern;
    });
  }

  function parseCard(card, dateHeaders) {
    const lines = getLines(card);
    const titleLine = lines.find(line => /[A-Z0-9.]{4,}\s+-\s+/.test(line)) || lines[0] || '';
    const timeLine = lines.find(line => /\(\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\)/.test(line)) || '';
    const timeMatch = timeLine.match(/\((\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\)/);
    const title = splitCourseTitle(titleLine);
    const timeIndex = lines.indexOf(timeLine);
    const room = lines[timeIndex + 1] || '';
    const instructor = lines[timeIndex + 2] || '';
    const lessonType = lines[timeIndex + 3] || '';
    const date = findClosestDate(card.getBoundingClientRect(), dateHeaders);

    return {
      courseCode: title.courseCode,
      name: title.name,
      classCode: title.classCode,
      date,
      startTime: timeMatch?.[1] || '',
      endTime: timeMatch?.[2] || '',
      room,
      instructor,
      lessonType,
      rawTitle: titleLine,
    };
  }

  function getScheduleKey(schedule) {
    return [
      cleanText(schedule.courseCode || schedule.rawTitle).toLowerCase(),
      cleanText(schedule.name).toLowerCase(),
      schedule.date,
      schedule.startTime,
      schedule.endTime,
      cleanText(schedule.room).toLowerCase(),
    ].join('::');
  }

  function scrape() {
    const dateHeaders = findDateHeaders();
    const cards = findEventCards();
    const seen = new Set();
    const schedules = cards
      .map(card => parseCard(card, dateHeaders))
      .filter(item => item.name && item.date && item.startTime && item.endTime)
      .filter((item) => {
        const key = getScheduleKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    if (schedules.length === 0) {
      throw new Error('Không tìm thấy lịch học trong tuần đang hiển thị');
    }

    return {
      source: 'usth_erp',
      page: 'timetable',
      scrapedAt: new Date().toISOString(),
      subjects: [],
      schedules,
    };
  }

  return { scrape };
})();
