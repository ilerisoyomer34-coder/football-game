export const CONFIG = {
  FIELD: { WIDTH: 105, HEIGHT: 68 },
  PLAYER: { SPEED: 12, SPRINT_SPEED: 18.5, RADIUS: 0.4, KICK_RANGE: 2.5, KICK_COOLDOWN: 0.38 },
  BALL: { RADIUS: 0.35, GRAVITY: 18, BOUNCE: 0.55, GROUND_FRICTION: 0.87, AIR_FRICTION: 0.992 },
  TEAMS: { PLAYER_COLOR: 0x1565C0, OPPONENT_COLOR: 0xC62828, GOALKEEPER_COLOR: 0x2E7D32 },
  GAME: { DURATION: 180, HALF_DURATION: 90, PLAYERS_PER_TEAM: 11 },
  GOAL: { WIDTH: 7.32, HEIGHT: 2.44, DEPTH: 2.5 }
};

// rating: 0-100  speed/shooting/passing: multipliers applied to AI & player stats
export const CLUB_TEAMS = [
  { id:'realmadrid',   name:'Real Madrid',        short:'RMA', primaryColor:0xEEEEEE, gkColor:0xFFD700, rating:91, speed:1.06, shooting:1.09, passing:1.11 },
  { id:'barcelona',    name:'FC Barcelona',        short:'BAR', primaryColor:0xA50044, gkColor:0xFF8C00, rating:89, speed:1.02, shooting:1.05, passing:1.15 },
  { id:'mancity',      name:'Manchester City',     short:'MCI', primaryColor:0x6CABDD, gkColor:0xFFD700, rating:91, speed:1.03, shooting:1.08, passing:1.13 },
  { id:'liverpool',    name:'Liverpool',           short:'LIV', primaryColor:0xC8102E, gkColor:0xFFD700, rating:89, speed:1.11, shooting:1.08, passing:1.07 },
  { id:'arsenal',      name:'Arsenal',             short:'ARS', primaryColor:0xEF0107, gkColor:0xFFD700, rating:87, speed:1.08, shooting:1.06, passing:1.11 },
  { id:'chelsea',      name:'Chelsea',             short:'CHE', primaryColor:0x034694, gkColor:0xFF4500, rating:83, speed:1.04, shooting:1.03, passing:1.05 },
  { id:'bayernmunich', name:'Bayern Munich',       short:'BAY', primaryColor:0xDC052D, gkColor:0xFFD700, rating:90, speed:1.07, shooting:1.13, passing:1.09 },
  { id:'dortmund',     name:'Borussia Dortmund',   short:'BVB', primaryColor:0xFDE100, gkColor:0xFF6600, rating:84, speed:1.13, shooting:1.04, passing:1.03 },
  { id:'psg',          name:'Paris Saint-Germain', short:'PSG', primaryColor:0x004170, gkColor:0xFFD700, rating:89, speed:1.12, shooting:1.11, passing:1.08 },
  { id:'inter',        name:'Inter Milan',         short:'INT', primaryColor:0x0068A8, gkColor:0xFFD700, rating:86, speed:1.01, shooting:1.07, passing:1.07 },
  { id:'juventus',     name:'Juventus',            short:'JUV', primaryColor:0x111111, gkColor:0xFF6600, rating:82, speed:0.98, shooting:1.04, passing:1.04 },
  { id:'atletico',     name:'Atletico Madrid',     short:'ATM', primaryColor:0xCC0000, gkColor:0xFFD700, rating:86, speed:1.03, shooting:1.06, passing:1.06 },
  { id:'galatasaray',  name:'Galatasaray',         short:'GAL', primaryColor:0xD4001A, gkColor:0x006400, rating:78, speed:1.06, shooting:1.07, passing:1.05 },
  { id:'fenerbahce',   name:'Fenerbahçe',          short:'FB',  primaryColor:0x002060, gkColor:0xFF6600, rating:77, speed:1.05, shooting:1.06, passing:1.06 },
  { id:'ajax',         name:'Ajax',                short:'AJX', primaryColor:0xD0002E, gkColor:0x006400, rating:80, speed:1.07, shooting:1.00, passing:1.09 },
  { id:'benfica',      name:'Benfica',             short:'BEN', primaryColor:0xCC0000, gkColor:0xFFD700, rating:80, speed:1.06, shooting:1.05, passing:1.06 },
];

export const NATIONAL_TEAMS = [
  { id:'turkey',      name:'Türkiye',        short:'TUR', primaryColor:0xE30A17, gkColor:0x003399, rating:79, speed:1.07, shooting:1.06, passing:1.05 },
  { id:'france',      name:'France',         short:'FRA', primaryColor:0x002395, gkColor:0x009A44, rating:90, speed:1.13, shooting:1.11, passing:1.09 },
  { id:'brazil',      name:'Brazil',         short:'BRA', primaryColor:0xFCD116, gkColor:0x009B3A, rating:90, speed:1.12, shooting:1.11, passing:1.10 },
  { id:'argentina',   name:'Argentina',      short:'ARG', primaryColor:0x74ACDF, gkColor:0xFFCC00, rating:90, speed:1.06, shooting:1.12, passing:1.13 },
  { id:'germany',     name:'Germany',        short:'GER', primaryColor:0xDDDDDD, gkColor:0xFF4500, rating:88, speed:1.04, shooting:1.09, passing:1.11 },
  { id:'england',     name:'England',        short:'ENG', primaryColor:0xDDDDDD, gkColor:0x006400, rating:87, speed:1.08, shooting:1.10, passing:1.08 },
  { id:'spain',       name:'Spain',          short:'ESP', primaryColor:0xAA151B, gkColor:0x006400, rating:88, speed:1.03, shooting:1.06, passing:1.16 },
  { id:'portugal',    name:'Portugal',       short:'POR', primaryColor:0x006600, gkColor:0xFFD700, rating:87, speed:1.09, shooting:1.11, passing:1.08 },
  { id:'italy',       name:'Italy',          short:'ITA', primaryColor:0x003399, gkColor:0xFFD700, rating:83, speed:1.00, shooting:1.05, passing:1.08 },
  { id:'netherlands', name:'Netherlands',    short:'NED', primaryColor:0xFF4F00, gkColor:0xFFFFFF, rating:85, speed:1.06, shooting:1.07, passing:1.10 },
  { id:'usa',         name:'United States',  short:'USA', primaryColor:0xB22234, gkColor:0xFFFFFF, rating:79, speed:1.09, shooting:1.03, passing:1.03 },
  { id:'japan',       name:'Japan',          short:'JPN', primaryColor:0x003087, gkColor:0xFF0000, rating:78, speed:1.11, shooting:1.00, passing:1.09 },
  { id:'morocco',     name:'Morocco',        short:'MAR', primaryColor:0xC1272D, gkColor:0xFFD700, rating:78, speed:1.08, shooting:1.02, passing:1.05 },
  { id:'senegal',     name:'Senegal',        short:'SEN', primaryColor:0x00853F, gkColor:0xFFFFFF, rating:77, speed:1.10, shooting:1.02, passing:1.03 },
  { id:'croatia',     name:'Croatia',        short:'CRO', primaryColor:0xFF0000, gkColor:0xFFD700, rating:84, speed:1.02, shooting:1.05, passing:1.11 },
  { id:'mexico',      name:'Mexico',         short:'MEX', primaryColor:0x006847, gkColor:0xFFFFFF, rating:77, speed:1.07, shooting:1.03, passing:1.06 },
];
