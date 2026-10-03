// Catalogue du seed. `zip` = nom du fichier dans seed/templates/ (sans .zip).
// entry : page d'aperçu ('' = pas d'aperçu, code seul). Par défaut : détectée automatiquement.
// encrypted : l'archive reçue était protégée par mot de passe — dépose une version sans mot de passe dans seed/templates/ et relance le seed.
// terms : mentions d'auteur supplémentaires à retirer pour ce template.
export const categories = [
  ['blog', 'Blog'], ['connexion', 'Connexion'], ['dashboard', 'Dashboard & admin'], ['e-commerce', 'E-commerce'],
  ['portfolio', 'Portfolio & CV'], ['restaurant', 'Restaurant'], ['education', 'Éducation'], ['agence', 'Agence & business'],
  ['sante', 'Santé'], ['media', 'Médias'], ['composants', 'Composants UI'], ['outils', 'Outils & calculatrices'],
  ['applications', 'Applications & backend'],
];

// Ordre = ordre d'import : le dernier importé apparaît en premier dans « Récents ».
// Les templates sans aperçu sont donc listés en premier pour passer en dernier.
export const templates = [
  // --- Applications (pas d'aperçu : code seul) ---
  { zip: 'argon-dashboard-flask-master', slug: 'argon-flask', title: 'Argon Dashboard — application Flask', category: 'applications', tags: ['flask', 'python', 'dashboard', 'jinja'], description: 'Application Flask complète avec le thème Argon. Code seul : elle doit être lancée avec Python.', entry: '' },
  { zip: 'forum', slug: 'forum-php', title: 'Forum PHP / MySQL', category: 'applications', tags: ['php', 'mysql', 'forum'], description: 'Forum en PHP avec base MySQL. Code seul : il demande un serveur PHP.', entry: '', terms: ['aliou dev', 'A_liou'] },
  // --- Connexion ---
  { zip: 'Hacker_Login_Form', slug: 'connexion-hacker', title: 'Connexion « hacker »', category: 'connexion', tags: ['sombre', 'néon', 'terminal'], description: 'Formulaire de connexion au style terminal, vert sur noir.' },
  { zip: 'Modern-Login-Form', slug: 'connexion-moderne', title: 'Connexion moderne', category: 'connexion', tags: ['minimal', 'responsive'], description: 'Formulaire de connexion épuré, sans JavaScript.' },
  { zip: 'Animated_Login_form', slug: 'connexion-animee', title: 'Connexion animée', category: 'connexion', tags: ['animation', 'css'], description: 'Formulaire de connexion avec animations en CSS pur.' },
  { zip: 'Glassmorphism_Login_Form_With_Theme', slug: 'connexion-glassmorphism-themes', title: 'Connexion glassmorphism à thèmes', category: 'connexion', tags: ['glassmorphism', 'thèmes', 'javascript'], description: 'Carte de connexion en verre dépoli avec changement de thème.' },
  { zip: 'login__codingtemplate', slug: 'connexion-glassmorphism', title: 'Connexion glassmorphism', category: 'connexion', tags: ['glassmorphism', 'css'], description: 'Formulaire de connexion translucide sur fond dégradé.' },
  { zip: 'connexion__codingtemplate', slug: 'connexion-inscription', title: 'Connexion et inscription', category: 'connexion', tags: ['formulaire', 'javascript'], description: 'Formulaires de connexion et d’inscription sur une seule page, avec bascule animée.' },

  // --- Composants UI ---
  { zip: 'Magic__codingtemplate', slug: 'menu-magique', title: 'Menu de navigation « magique »', category: 'composants', tags: ['navigation', 'animation', 'menu'], description: 'Barre de navigation à onglets avec indicateur animé.' },
  { zip: 'Tab_bar_Navigation', slug: 'barre-onglets', title: 'Barre d’onglets', category: 'composants', tags: ['navigation', 'mobile', 'javascript'], description: 'Barre d’onglets façon application mobile.' },
  { zip: 'Card_Slider_using_JS', slug: 'slider-cartes', title: 'Slider de cartes', category: 'composants', tags: ['slider', 'javascript', 'cartes'], description: 'Carrousel de cartes en JavaScript natif.' },
  { zip: 'card_hover', slug: 'cartes-survol', encrypted: true, title: 'Cartes au survol', category: 'composants', tags: ['cartes', 'hover', 'css'], description: 'Effets de survol sur des cartes, en CSS pur.' },
  { zip: 'loading_hand', slug: 'chargement-main', title: 'Animation de chargement : la main', category: 'composants', tags: ['loader', 'animation', 'css'], description: 'Animation de chargement « main qui réfléchit », en CSS.' },

  // --- Outils ---
  { zip: 'Old_Calculator', slug: 'calculatrice-retro', title: 'Calculatrice rétro', category: 'outils', tags: ['calculatrice', 'rétro', 'css'], description: 'Calculatrice à l’esthétique d’un ancien appareil.' },
  { zip: 'calcul__codingtemplate', slug: 'calculatrice-glassmorphism', title: 'Calculatrice glassmorphism', category: 'outils', tags: ['calculatrice', 'glassmorphism', 'javascript'], description: 'Calculatrice fonctionnelle en verre dépoli.' },
  { zip: 'code_source', slug: 'calculatrice-neumorphique', title: 'Calculatrice neumorphique', category: 'outils', tags: ['calculatrice', 'neumorphisme', 'thème clair/sombre'], description: 'Calculatrice neumorphique avec thème clair et sombre.' },
  { zip: 'calcul', slug: 'calculatrice', encrypted: true, title: 'Calculatrice', category: 'outils', tags: ['calculatrice', 'javascript'], description: 'Calculatrice en JavaScript.' },
  { zip: 'clock__codingtemplate', slug: 'horloge-analogique', title: 'Horloge analogique glassmorphism', category: 'outils', tags: ['horloge', 'glassmorphism', 'javascript'], description: 'Horloge analogique en verre dépoli qui affiche l’heure réelle.' },

  // --- Sites vitrines ---
  { zip: 'Architech', slug: 'architech', title: 'Architech — cabinet d’architecture', category: 'agence', tags: ['architecture', 'responsive', 'photos'], description: 'Site vitrine pour un cabinet d’architecture, avec galerie de réalisations.' },
  { zip: 'agency__codingtemplate', slug: 'agency-bootstrap', title: 'Agency — thème Bootstrap', category: 'agence', tags: ['bootstrap', 'one-page', 'portfolio'], description: 'Thème d’agence en une page : services, portfolio, équipe et contact.' },
  { zip: 'Site_pour_agence_de_Seo', slug: 'agence-seo', title: 'Agence SEO', category: 'agence', tags: ['seo', 'marketing', 'responsive', 'scss'], description: 'Site responsive pour une agence de référencement.' },
  { zip: 'site_UI_-_coding_premium', slug: 'sceo-agence-seo', title: 'SCEO — agence SEO', category: 'agence', tags: ['seo', 'landing', 'moderne'], description: 'Page d’atterrissage soignée pour une agence SEO.' },
  { zip: 'site_Coding', slug: 'agence-design-developpement', title: 'Agence de design et développement', category: 'agence', tags: ['agence', 'responsive', 'scss', 'svg'], description: 'Site d’agence créative : services, réalisations, contact.' },

  // --- Restaurant ---
  { zip: 'Tasty___Template_et_hacking__', slug: 'tasty', title: 'Tasty — site de cuisine', category: 'restaurant', tags: ['cuisine', 'responsive', 'plats'], description: 'Site de restauration responsive avec menu et photos de plats.' },
  { zip: 'resto_-_Coding_Team', slug: 'resto', title: 'Restaurant — site complet', category: 'restaurant', tags: ['restaurant', 'responsive', 'menu'], description: 'Site de restaurant complet : accueil, plats, avis, réservation.' },
  { zip: 'site_de_restaurant', slug: 'restaurant-responsive', title: 'Restaurant responsive', category: 'restaurant', tags: ['restaurant', 'responsive', 'scss'], description: 'Site de restaurant responsive avec carte et galerie.' },

  // --- E-commerce ---
  { zip: 'Ecommerce__codingtemplate', slug: 'boutique-simple', title: 'Boutique en ligne simple', category: 'e-commerce', tags: ['boutique', 'javascript', 'responsive'], description: 'Page de boutique en ligne en HTML, CSS et JavaScript.', terms: ['Raj'] },
  { zip: 'e-commerce_-_codingtuto', slug: 'anon-ecommerce', title: 'Anon — site e-commerce complet', category: 'e-commerce', tags: ['e-commerce', 'responsive', 'produits'], description: 'Site e-commerce complet : produits, promotions, catégories, panier.' },
  { zip: 'site_pour_cosmétique__Coding__', slug: 'cosmetiques', title: 'Boutique de cosmétiques', category: 'e-commerce', tags: ['cosmétique', 'beauté', 'responsive'], description: 'Site de boutique de produits cosmétiques, responsive.' },

  // --- Éducation ---
  { zip: 'Education_by_Coding_Team', slug: 'education', title: 'Site d’éducation', category: 'education', tags: ['école', 'cours', 'responsive'], description: 'Site éducatif responsive : cours, enseignants, inscription.' },
  { zip: 'site_pour_École', slug: 'ecole-en-ligne', title: 'École en ligne', category: 'education', tags: ['e-learning', 'cours', 'scss'], description: 'Site d’école en ligne : formations, avantages, contact.' },
  { zip: 'ecole', slug: 'ecole-multipages', title: 'École — site multi-pages', category: 'education', tags: ['école', 'multi-pages', 'javascript'], description: 'Site d’école avec plusieurs pages liées entre elles.', entry: 'home.html' },

  // --- Santé ---
  { zip: 'Hôpital_website_by_coding_team', slug: 'hopital', title: 'Site d’hôpital', category: 'sante', tags: ['santé', 'hôpital', 'responsive'], description: 'Site vitrine pour un hôpital : services, médecins, prise de rendez-vous.' },

  // --- Médias ---
  { zip: 'CineFlix__template_et_hacking_', slug: 'cineflix', title: 'CineFlix — site de cinéma', category: 'media', tags: ['cinéma', 'films', 'sombre'], description: 'Site de cinéma avec affiches, sorties et ambiance sombre.' },
  { zip: 'netflix__codingtemplate', slug: 'accueil-netflix', encrypted: true, title: 'Accueil façon Netflix', category: 'media', tags: ['streaming', 'sombre', 'css'], description: 'Page d’accueil de streaming inspirée de Netflix.' },
  { zip: 'music__codingtemplate', slug: 'lecteur-musique', encrypted: true, title: 'Lecteur de musique', category: 'media', tags: ['musique', 'audio', 'javascript'], description: 'Lecteur de musique avec liste de morceaux.' },

  // --- Blog, portfolio ---
  { zip: 'blog', slug: 'blog-tc', title: 'TC Blogs', category: 'blog', tags: ['blog', 'articles', 'responsive'], description: 'Blog responsive avec articles à la une, catégories et pages.', terms: ['Techie Coder', 'templatesethacking'] },
  { zip: 'mon_cv__coding_', slug: 'portfolio-cv', title: 'Portfolio et CV', category: 'portfolio', tags: ['cv', 'portfolio', 'multi-pages'], description: 'CV en ligne multi-pages : à propos, compétences, projets, contact.', entry: 'home.html' },

  // --- Dashboard ---
  { zip: 'panneau_admin', slug: 'panneau-admin', title: 'Panneau d’administration responsive', category: 'dashboard', tags: ['admin', 'dashboard', 'responsive'], description: 'Tableau de bord d’administration responsive.' },
  { zip: 'gentelella', slug: 'gentelella', title: 'Gentelella — dashboard Bootstrap', category: 'dashboard', tags: ['bootstrap', 'dashboard', 'graphiques', 'multi-pages'], description: 'Template d’administration Bootstrap : graphiques, tableaux, formulaires, calendrier. Version allégée.', entry: 'production/index.html' },

];
