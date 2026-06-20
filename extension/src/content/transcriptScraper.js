window.UsthTranscriptScraper = (() => {
  const { cleanText, parseNumber } = window.UsthErpNormalizer;

  const HEADER_MATCHERS = {
    no: ['stt', 'no.'],
    code: ['course code', 'ma hoc phan'],
    name: ['course title', 'ten hoc phan'],
    credits: ['ects credits', 'so tin chi'],
    semesterCode: ['semester', 'hoc ky'],
    score20: ['usth grade', 'diem thang 20'],
    ectsGrade: ['ects grade', 'thang diem ects'],
    validation: ['validation', 'hoan thanh'],
  };

  function findTranscriptTable() {
    return [...document.querySelectorAll('table')].find((table) => {
      const text = normalizeSearchText(table.innerText);
      return text.includes('course code') && text.includes('usth grade') && text.includes('ects credits');
    });
  }

  function normalizeSearchText(value) {
    return cleanText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase();
  }

  function matchHeader(text, patterns) {
    const normalized = normalizeSearchText(text);
    return patterns.some((pattern) => normalized.includes(pattern));
  }

  function getHeaderIndexes(table) {
    const headerRow = [...table.querySelectorAll('tr')].find((row) => {
      const texts = [...row.querySelectorAll('th, td')].map((cell) => cleanText(cell.innerText || cell.textContent));
      return texts.some((text) => matchHeader(text, HEADER_MATCHERS.code)) &&
        texts.some((text) => matchHeader(text, HEADER_MATCHERS.score20)) &&
        texts.some((text) => matchHeader(text, HEADER_MATCHERS.credits));
    });
    const headerCells = headerRow
      ? [...headerRow.querySelectorAll('th, td')].map((cell) => cleanText(cell.innerText || cell.textContent))
      : [];

    const indexes = Object.entries(HEADER_MATCHERS).reduce((acc, [key, patterns]) => {
      const index = headerCells.findIndex((text) => matchHeader(text, patterns));
      if (index >= 0) acc[key] = index;
      return acc;
    }, {});

    return {
      no: indexes.no ?? 0,
      code: indexes.code ?? 1,
      name: indexes.name ?? 2,
      credits: indexes.credits ?? 3,
      semesterCode: indexes.semesterCode ?? 4,
      score20: indexes.score20 ?? 5,
      ectsGrade: indexes.ectsGrade ?? 6,
      validation: indexes.validation ?? 7,
    };
  }

  function getCell(cells, indexes, key) {
    return cleanText(cells[indexes[key]] || '');
  }

  function isSemesterCode(value) {
    return /^20\d{3}$/.test(cleanText(value));
  }

  function isEctsGrade(value) {
    return /^(a\+?|b\+?|c\+?|d\+?|f)$/i.test(cleanText(value));
  }

  function parseScore20(cells, indexes) {
    const mappedScore = parseNumber(getCell(cells, indexes, 'score20'));
    if (mappedScore !== null && mappedScore >= 0 && mappedScore <= 20) {
      return mappedScore;
    }

    const semesterIndex = cells.findIndex(isSemesterCode);
    if (semesterIndex >= 0) {
      for (let index = semesterIndex + 1; index < cells.length; index += 1) {
        const value = parseNumber(cells[index]);
        if (value !== null && value >= 0 && value <= 20) return value;
        if (isEctsGrade(cells[index])) break;
      }
    }

    return null;
  }

  function parseEctsGrade(cells, indexes) {
    const mappedGrade = getCell(cells, indexes, 'ectsGrade');
    if (isEctsGrade(mappedGrade)) return mappedGrade;
    return cells.find(isEctsGrade) || mappedGrade;
  }

  function isConditionalCourseHeader(text) {
    const normalized = normalizeSearchText(text);
    return normalized.includes('hoc phan dieu kien') || normalized.includes('conditional course');
  }

  function scrape() {
    const table = findTranscriptTable();
    if (!table) {
      throw new Error('Không tìm thấy bảng điểm trên trang ERP');
    }

    const indexes = getHeaderIndexes(table);
    const rows = [...table.querySelectorAll('tr')];
    const subjects = [];
    const excludedSubjects = [];
    let inConditionalCourseSection = false;

    rows.forEach((row) => {
      const cells = [...row.querySelectorAll('td')].map((cell) => cleanText(cell.innerText || cell.textContent));
      const rowText = cleanText(cells.join(' '));
      if (isConditionalCourseHeader(rowText)) {
        inConditionalCourseSection = true;
        return;
      }

      if (cells.length < 7) return;

      const no = getCell(cells, indexes, 'no');
      const code = getCell(cells, indexes, 'code');
      const name = getCell(cells, indexes, 'name');
      const credits = getCell(cells, indexes, 'credits');
      const semesterCode = getCell(cells, indexes, 'semesterCode');
      const score20 = parseScore20(cells, indexes);
      const ectsGrade = parseEctsGrade(cells, indexes);
      const validation = getCell(cells, indexes, 'validation');
      const isDataRow = /^\d+$/.test(no) && code && name && !name.toLowerCase().includes('summary');
      if (!isDataRow) return;

      const subject = {
        code,
        name,
        credits: parseNumber(credits),
        semesterCode,
        score20,
        ectsGrade,
        validation,
        section: inConditionalCourseSection ? 'conditional_course' : 'gpa',
        isConditionalCourse: inConditionalCourseSection,
      };

      if (inConditionalCourseSection) {
        excludedSubjects.push(subject);
        return;
      }

      subjects.push(subject);
    });

    return {
      source: 'usth_erp',
      page: 'personal-transcript',
      scrapedAt: new Date().toISOString(),
      subjects,
      excludedSubjects,
      schedules: [],
    };
  }

  return { scrape };
})();
