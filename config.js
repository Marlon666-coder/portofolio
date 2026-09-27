/* =====================================================================
 *  MRV // SYSTEM — SITE CONFIGURATION
 *  ---------------------------------------------------------------------
 *  Edit this single file to change the owner name, colors, skills,
 *  projects ("missions"), social links, and intro behaviour.
 *  Everything else in the site reads from window.MRV_CONFIG.
 * ===================================================================== */
window.MRV_CONFIG = {
  owner: {
    name: 'MARLO RIZKY VALENTINO',
    initials: 'MRV',
    shortName: 'MARLO.RV',
    role: 'SOFTWARE DEVELOPER',
    tagline: 'BUILDING THE FUTURE, ONE LINE OF CODE AT A TIME.',
    about:
      'Marlo Rizky Valentino is a developer interested in programming, software development, ' +
      'interactive applications, algorithms, and creative technology.',
    interests: ['Programming', 'Software Development', 'Interactive Applications', 'Algorithms', 'Creative Technology']
  },

  /* Brand colors (also exported as CSS variables --c-*) */
  colors: {
    cyan: '#3ef2ff',
    blue: '#2d7bff',
    purple: '#8b5cff',
    orange: '#ff8a3d',
    bg: '#02030a'
  },

  /* Contact + social. Replace the placeholder values with real ones. */
  contact: {
    email: 'your.email@example.com',
    github: 'https://github.com/your-username'
  },
  socials: [
    { label: 'GitHub', url: 'https://github.com/your-username' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/your-username' },
    { label: 'Instagram', url: 'https://www.instagram.com/your-username' }
  ],

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

  /* Projects → "MISSION LOG". URLs are placeholders — replace them. */
  projects: [
    {
      code: '01',
      title: 'KALKULATOR MARLO',
      description: 'A calculator application for performing everyday arithmetic operations with a clean, simple interface.',
      tech: ['JavaScript', 'HTML', 'CSS'],
      github: 'https://github.com/your-username/kalkulator-marlo',
      demo: 'https://your-username.github.io/kalkulator-marlo'
    },
    {
      code: '02',
      title: 'SNAKE GAME',
      description: 'A take on the classic Snake game: steer the snake, collect food, grow longer and avoid collisions.',
      tech: ['JavaScript', 'HTML Canvas'],
      github: 'https://github.com/your-username/snake-game',
      demo: 'https://your-username.github.io/snake-game'
    },
    {
      code: '03',
      title: 'FPB & KPK EDUCATIONAL GAME',
      description: 'An educational game for practising FPB (greatest common divisor) and KPK (least common multiple) in an interactive way.',
      tech: ['JavaScript', 'HTML', 'CSS'],
      github: 'https://github.com/your-username/fpb-kpk-game',
      demo: 'https://your-username.github.io/fpb-kpk-game'
    },
    {
      code: '04',
      title: 'KICAU MANIA DETECTOR',
      description: 'A playful interactive "detector" application themed around the Kicau Mania trend.',
      tech: ['Python'],
      github: 'https://github.com/your-username/kicau-mania-detector',
      demo: 'https://your-username.github.io/kicau-mania-detector'
    }
  ],

  intro: {
    enabled: true,      // false = go straight to the portfolio
    timeScale: 1        // >1 plays the cinematic faster
  }
};
