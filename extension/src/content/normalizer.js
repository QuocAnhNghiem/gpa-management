window.UsthErpNormalizer = (() => {
  const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  const parseNumber = (value) => {
    const normalized = cleanText(value).replace(',', '.').match(/-?\d+(\.\d+)?/);
    return normalized ? Number(normalized[0]) : null;
  };

  const parseDateFromHeader = (value) => {
    const match = cleanText(value).match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (!match) return '';
    return `${match[3]}-${match[2]}-${match[1]}`;
  };

  const splitCourseTitle = (value) => {
    const parts = cleanText(value).split(/\s+-\s+/).filter(Boolean);
    if (parts.length === 0) return { courseCode: '', name: '', classCode: '' };
    if (parts.length === 1) return { courseCode: parts[0], name: parts[0], classCode: '' };
    return {
      courseCode: parts[0],
      name: parts.slice(1, -1).join(' - ') || parts[1],
      classCode: parts.length > 2 ? parts[parts.length - 1] : '',
    };
  };

  const getLines = (element) => {
    const text = (element.innerText || element.textContent || '')
      .split('\n')
      .map(cleanText)
      .filter(Boolean);
    return [...new Set(text)];
  };

  return {
    cleanText,
    parseNumber,
    parseDateFromHeader,
    splitCourseTitle,
    getLines,
  };
})();
