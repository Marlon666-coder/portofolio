/* =====================================================================
 *  MRV // SYSTEM — SITE CONFIGURATION
 *  ---------------------------------------------------------------------
 *  Edit this single file to change your personal info, colors, skills,
 *  education, projects, certificates, CV, contact links and intro.
 *  Everything else in the site reads from window.MRV_CONFIG.
 *
 *  Tip: any optional value left as '' (empty string) is simply hidden.
 * ===================================================================== */
window.MRV_CONFIG = {
  owner: {
    name: 'MARLO RIZKY VALENTINO',
    initials: 'MRV',
    shortName: 'MARLO.RV',
    role: 'COMPUTER SCIENCE STUDENT',
    university: 'BINUS University',
    major: 'Computer Science',
    tagline: 'Building Ideas Into Digital Experiences.',
    about:
      'Computer Science student at BINUS University, passionate about turning ideas into ' +
      'working software, from clean web interfaces to logic-heavy programs and creative experiments.',
    interests: [
      'Programming',
      'Software Development',
      'Web Development',
      'Artificial Intelligence',
      'Problem Solving',
      'Creative Technology'
    ],
    /* Profile photo for the holographic hero. Put your file at this path
     * (a square, high-resolution JPG/PNG/WebP of ~800×800 px or more works best). */
    photo: 'assets/images/profile/marlo-profile.jpg',
    photoAlt: 'Profile photo of Marlo Rizky Valentino'
  },

  /* Brand colors (also exported as CSS variables --c-*) */
  colors: {
    cyan: '#3ef2ff',
    blue: '#2d7bff',
    purple: '#8b5cff',
    orange: '#ff8a3d',
    bg: '#02030a'
  },

  /* Contact. Leave a value as '' to hide it. */
  contact: {
    instagram: { handle: '@minrzky.__', url: 'https://www.instagram.com/minrzky.__/' },
    whatsapp: { display: '0813-4631-7088', url: 'https://wa.me/6281346317088' },
    github: 'https://github.com/Marlon666-coder',
    linkedin: '',   // e.g. 'https://www.linkedin.com/in/your-profile'
    email: ''       // e.g. 'name@example.com'
  },

  /* Skills → "TECHNICAL ARSENAL" (no skill levels, just the list) */
  skills: [
    { name: 'C', glyph: 'C', group: 'LANGUAGE' },
    { name: 'C++', glyph: 'C++', group: 'LANGUAGE' },
    { name: 'Python', glyph: 'Py', group: 'LANGUAGE' },
    { name: 'JavaScript', glyph: 'JS', group: 'LANGUAGE' },
    { name: 'HTML', glyph: '</>', group: 'WEB' },
    { name: 'CSS', glyph: '{ }', group: 'WEB' },
    { name: 'Git', glyph: 'git', group: 'TOOLING' },
    { name: 'GitHub', glyph: 'GH', group: 'TOOLING' },
    { name: 'Algorithms', glyph: 'f(x)', group: 'FUNDAMENTALS' },
    { name: 'Data Structures', glyph: '[ ]', group: 'FUNDAMENTALS' }
  ],

  /* Education timeline. Add more objects to extend it (newest first). */
  education: [
    {
      institution: 'BINUS University',
      program: 'Computer Science',
      period: '2026 – Present',
      status: 'IN PROGRESS',
      description: ''   // optional short note, e.g. focus area or achievements
    }
  ],

  /* Projects → "PROJECTS". Leave github/demo as '' if not published yet
   * (the button then shows "COMING SOON" instead of a broken link).
   * image: optional screenshot path, e.g. 'assets/images/projects/snake.jpg' */
  projects: [
    {
      code: '01',
      title: 'KALKULATOR MARLO',
      description: 'A calculator application for performing everyday arithmetic operations with a clean, simple interface.',
      tech: ['JavaScript', 'HTML', 'CSS'],
      github: '',
      demo: '',
      image: ''
    },
    {
      code: '02',
      title: 'SNAKE GAME',
      description: 'A take on the classic Snake game: steer the snake, collect food, grow longer and avoid collisions.',
      tech: ['JavaScript', 'HTML Canvas'],
      github: '',
      demo: '',
      image: ''
    },
    {
      code: '03',
      title: 'FPB & KPK EDUCATIONAL GAME',
      description: 'An educational game for practising FPB (greatest common divisor) and KPK (least common multiple) in an interactive way.',
      tech: ['JavaScript', 'HTML', 'CSS'],
      github: 'https://github.com/Marlon666-coder/kpkfpb',
      demo: 'https://marlon666-coder.github.io/kpkfpb/',
      image: ''
    },
    {
      code: '04',
      title: 'KICAU MANIA DETECTOR',
      description: 'A playful interactive "detector" application themed around the Kicau Mania trend.',
      tech: ['Python'],
      github: '',
      demo: '',
      image: ''
    }
  ],

  /* Certificates gallery. While this list is empty a "Certificates Coming
   * Soon" panel is shown. Example entry (put images in assets/certificates/):
   *
   *  {
   *    title: 'Certificate Title',
   *    issuer: 'Issuing Organization',
   *    date: 'January 2027',
   *    credential: 'Credential ID or short description',
   *    image: 'assets/certificates/certificate-name.jpg',
   *    url: ''   // optional: online verification link
   *  }
   */
  certificates: [],

  /* CV / Resume. Drop your PDF at this path; until then the buttons show
   * an elegant "not uploaded yet" message instead of a broken link. */
  cv: {
    file: 'assets/cv/marlo-rizky-valentino-cv.pdf',
    downloadName: 'Marlo-Rizky-Valentino-CV.pdf'
  },

  intro: {
    enabled: true,      // false = go straight to the portfolio
    timeScale: 1        // >1 plays the cinematic faster
  }
};
