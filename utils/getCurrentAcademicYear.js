const getAcademicYearDetails = () => {
  let currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const academicYearStartMonth = 4;
  const academicYearEndMonth = 3;

  let academicYearStart, academicYearEnd;

  if (month >= academicYearStartMonth) {
    academicYearStart = new Date(year, academicYearStartMonth - 1, 1);
    academicYearEnd = new Date(year + 1, academicYearEndMonth - 1, 31);
  } else {
    academicYearStart = new Date(year - 1, academicYearStartMonth - 1, 1);
    academicYearEnd = new Date(year, academicYearEndMonth - 1, 31);
  }
  return {
    academic_year_from: academicYearStart.getFullYear(),
    academic_year_to: academicYearEnd.getFullYear(),
    academic_month_from: academicYearStart.getMonth() + 1,
    academic_month_to: academicYearEnd.getMonth() + 1,
  };
};

module.exports = getAcademicYearDetails;
