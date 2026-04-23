import { neon } from "@neondatabase/serverless";

let initialized = false;

function getDb() {
  return neon(process.env.DATABASE_URL!);
}

// --- Seed data with realistic vote distributions ---
// Format: [text, hot_votes, not_votes]
// Seeded at ~5-7 total votes so real users dominate quickly
const SEED_DATA: [string, number, number][] = [
  // Life & relationships
  ["Marriage?", 4, 3],
  ["Kids?", 3, 4],
  ["Divorce?", 2, 5],
  ["Cheating?", 1, 6],
  ["Therapy?", 5, 2],
  ["Religion?", 3, 4],
  ["Politics?", 2, 5],
  ["Tattoos?", 4, 3],
  ["Botox?", 2, 5],
  ["Influencers?", 2, 5],
  ["OnlyFans?", 3, 4],
  ["Gambling?", 2, 5],
  ["Dating apps?", 3, 4],
  ["Ghosting?", 1, 6],
  // Media & entertainment
  ["Books?", 6, 1],
  ["Podcasts?", 5, 2],
  ["Netflix?", 5, 2],
  ["Gaming?", 4, 3],
  ["Fortnite?", 3, 4],
  ["FIFA?", 4, 3],
  ["TikTok?", 3, 4],
  ["Memes?", 6, 1],
  ["Brainrot?", 3, 4],
  // Food & lifestyle
  ["Uber?", 5, 2],
  ["Deliveroo?", 4, 3],
  ["Meal prep?", 4, 3],
  ["Cooking?", 6, 1],
  ["Cleaning?", 3, 4],
  ["Shopping?", 5, 2],
  ["McDonald's?", 4, 3],
  ["Coffee?", 6, 1],
  ["Oat milk?", 3, 4],
  ["Pineapple on pizza?", 3, 4],
  ["Crocs?", 3, 4],
  ["Fast fashion?", 2, 5],
  ["Naps?", 7, 0],
  ["Cold showers?", 3, 4],
  ["Gym at 6am?", 3, 4],
  // Social & online
  ["Twitter?", 3, 4],
  ["Reddit?", 4, 3],
  ["Discord?", 4, 3],
  ["LinkedIn?", 2, 5],
  ["Personal brand?", 3, 4],
  ["Networking?", 3, 4],
  ["Group chats?", 4, 3],
  ["Read receipts?", 2, 5],
  ["Reply all?", 1, 6],
  ["Small talk?", 2, 5],
  // Business & hustle
  ["Startups?", 4, 3],
  ["Dropshipping?", 2, 5],
  ["Freelancing?", 4, 3],
  ["Side hustles?", 5, 2],
  ["Hustle culture?", 3, 4],
  ["Remote work?", 6, 1],
  // Money
  ["Savings?", 5, 2],
  ["Investing?", 5, 2],
  ["Stocks?", 4, 3],
  ["Trading?", 3, 4],
  ["Passive income?", 6, 1],
  ["Budgeting?", 4, 3],
  ["Luxury?", 4, 3],
  ["Rolex?", 3, 4],
  ["Crypto?", 3, 4],
  // Life
  ["Holidays?", 7, 0],
  ["Travel?", 6, 1],
  ["Sleep?", 7, 0],
  ["Money?", 5, 2],
  ["AI?", 4, 3],
  ["Tipping culture?", 2, 5],
  // Work
  ["Your boss?", 2, 5],
  ["Your ex?", 2, 5],
  ["Office?", 3, 4],
  ["Meetings?", 1, 6],
  ["Emails?", 1, 6],
  ["Deadlines?", 2, 5],
  ["Commuting?", 1, 6],
  ["9 to 5?", 2, 5],
  ["Overtime?", 1, 6],
  ["Burnout?", 1, 6],
  ["Work?", 3, 4],
  ["Mondays?", 1, 6],
  ["5-day work week?", 2, 5],
  // Edgy & divisive
  ["Situationships?", 2, 5],
  ["Body count?", 3, 4],
  ["Age gaps?", 2, 5],
  ["Open relationships?", 2, 5],
  ["Prenups?", 5, 2],
  ["Staying friends?", 3, 4],
  ["Dry January?", 3, 4],
  ["Microdosing?", 3, 4],
  ["Astrology?", 2, 5],
  ["Manifestation?", 3, 4],
  ["Toxic traits?", 2, 5],
  ["Red flags?", 5, 2],
  ["Lovebombing?", 1, 6],
  ["Quiet quitting?", 4, 3],
  ["Loud quitting?", 3, 4],
  ["Nepotism?", 1, 6],
  ["Cancel culture?", 2, 5],
  ["Free speech?", 5, 2],
  ["Gender reveal?", 3, 4],
  ["Weddings?", 4, 3],
  ["Funerals?", 2, 5],
  ["Gap years?", 5, 2],
  ["Uni?", 4, 3],
  ["Student debt?", 1, 6],
  ["Rent?", 1, 6],
  ["Landlords?", 1, 6],
  ["Tipping?", 3, 4],
  ["Private school?", 3, 4],
  ["Homeschooling?", 2, 5],
  ["Veganism?", 2, 5],
  ["Meat?", 5, 2],
  ["Protein shakes?", 4, 3],
  ["Steroids?", 1, 6],
  ["Plastic surgery?", 2, 5],
  ["Lip filler?", 2, 5],
  ["Fake tan?", 2, 5],
  ["Designer bags?", 3, 4],
  ["Leasing a car?", 3, 4],
  ["Renting forever?", 2, 5],
  ["Living alone?", 5, 2],
  ["Moving abroad?", 5, 2],
  ["Long distance?", 2, 5],
  ["Couples therapy?", 5, 2],
  ["Joint accounts?", 3, 4],
  ["Splitting bills?", 4, 3],
  ["Stay at home?", 4, 3],
  ["Maternity leave?", 6, 1],
  ["Paternity leave?", 6, 1],
  ["Smacking kids?", 1, 6],
  ["Screen time?", 3, 4],
  ["Helicopter parents?", 1, 6],
  // Tough 50/50
  ["Honesty always?", 4, 3],
  ["White lies?", 4, 3],
  ["Second chances?", 4, 3],
  ["Forgiveness?", 5, 2],
  ["Revenge?", 3, 4],
  ["Loyalty?", 6, 1],
  ["Ambition?", 5, 2],
  ["Ego?", 3, 4],
  ["Jealousy?", 2, 5],
  ["Vulnerability?", 5, 2],
  ["Crying in public?", 3, 4],
  ["Therapy for men?", 6, 1],
  ["Masculinity?", 3, 4],
  ["Feminism?", 4, 3],
  ["Monogamy?", 4, 3],
  ["Soulmates?", 4, 3],
  ["Luck?", 4, 3],
  ["Karma?", 4, 3],
  ["Afterlife?", 3, 4],
  ["Simulation?", 3, 4],
  ["Aliens?", 4, 3],
  ["Conspiracy theories?", 2, 5],
  ["True crime?", 5, 2],
  ["Death penalty?", 3, 4],
  ["Drugs?", 2, 5],
  ["Alcohol?", 4, 3],
  ["Weed?", 4, 3],
  ["Clubbing?", 3, 4],
  ["House parties?", 5, 2],
  ["Festivals?", 5, 2],
  ["Karaoke?", 4, 3],
  ["Public speaking?", 3, 4],
  ["Cold calling?", 1, 6],
  ["Selling yourself?", 3, 4],
  ["Fake it?", 3, 4],
  ["Quitting?", 4, 3],
  ["Starting over?", 5, 2],
  ["Regrets?", 3, 4],
  ["FOMO?", 3, 4],
  ["YOLO?", 4, 3],
  ["Bucket lists?", 5, 2],
  ["New year goals?", 3, 4],
  ["Self help?", 4, 3],
  ["Journaling?", 4, 3],
  ["Meditation?", 5, 2],
  ["5am club?", 2, 5],
  ["No days off?", 2, 5],
  ["Rest days?", 6, 1],
  ["Cheat meals?", 5, 2],
  ["Calorie counting?", 2, 5],
  ["Intermittent fasting?", 3, 4],
  ["Ozempic?", 2, 5],
  // People
  ["Elon Musk?", 3, 4],
  ["Donald Trump?", 2, 5],
  ["Kanye West?", 3, 4],
  ["Andrew Tate?", 2, 5],
  ["MrBeast?", 4, 3],
  ["Kim Kardashian?", 2, 5],
  ["Taylor Swift?", 4, 3],
  ["Cristiano Ronaldo?", 5, 2],
  ["Lionel Messi?", 6, 1],
  ["Drake?", 4, 3],
  ["Logan Paul?", 2, 5],
  ["Jake Paul?", 1, 6],
  ["Jeff Bezos?", 2, 5],
  ["Mark Zuckerberg?", 2, 5],
  ["Sam Altman?", 3, 4],
  ["Joe Rogan?", 3, 4],
  ["Piers Morgan?", 2, 5],
  ["Jeremy Clarkson?", 5, 2],
  ["Gordon Ramsay?", 6, 1],
  ["Simon Cowell?", 3, 4],
  ["David Beckham?", 5, 2],
  ["Ryan Reynolds?", 6, 1],
  ["Keanu Reeves?", 7, 0],
  ["Dwayne Johnson?", 5, 2],
  ["Zendaya?", 5, 2],
  ["Billie Eilish?", 3, 4],
  ["Harry Styles?", 4, 3],
  ["Adele?", 5, 2],
  ["Ed Sheeran?", 4, 3],
  ["Margot Robbie?", 5, 2],
  // Relatable & chaotic
  ["Lying to avoid plans?", 4, 3],
  ["Kicking dogs?", 0, 7],
  ["Fake sick days?", 5, 2],
  ["Ghosting after dates?", 2, 5],
  ["Quitting without notice?", 3, 4],
  ["Taking credit at work?", 1, 6],
  ["Not tipping?", 2, 5],
  ["Skipping the queue?", 1, 6],
  ["Cancelling last minute?", 3, 4],
  ["Buying things drunk?", 3, 4],
  ["Buying fake designer?", 2, 5],
  ["Pretending to work?", 5, 2],
  ["Job hopping?", 4, 3],
  ["Leaving early Friday?", 6, 1],
  ["Oversharing?", 3, 4],
  ["Keeping secrets?", 3, 4],
  ["Stalking profiles?", 4, 3],
  ["Eating in bed?", 5, 2],
  ["Skipping showers?", 2, 5],
  ["Wearing same clothes?", 4, 3],
  ["Doomscrolling?", 3, 4],
  ["Checking ex profiles?", 3, 4],
  ["Pirating movies?", 5, 2],
  ["Re-gifting presents?", 3, 4],
  ["Clapping when landing?", 2, 5],
  ["Forgetting names?", 4, 3],
  ["Awkward eye contact?", 3, 4],
  ["Talking over others?", 1, 6],
  ["Saying wrong name?", 2, 5],
  ["Ignoring calls?", 4, 3],
  ["Snoozing alarm?", 5, 2],
  ["Singing in public?", 3, 4],
  ["Talking to pets?", 6, 1],
  ["Making weird noises?", 4, 3],
  ["Quoting movies?", 5, 2],
  ["Fake scenarios?", 5, 2],
  ["Practising arguments?", 5, 2],
  ["Typing then deleting?", 4, 3],
  ["Splitting the bill?", 4, 3],
  ["Dissociating?", 3, 4],
  ["Gym?", 5, 2],
  ["Coffee dates?", 5, 2],
  ["Leaving group chats?", 4, 3],
  ["Being late?", 3, 4],
  ["Ignoring bank balance?", 3, 4],
  ["Posting then deleting?", 3, 4],
  ["Refreshing notifications?", 3, 4],
  ["Checking who viewed?", 4, 3],
  ["Booking flights randomly?", 5, 2],
  ["Showing up unannounced?", 2, 5],
  ["Blocking people?", 4, 3],
  // Pop culture & misc additions
  ["Board games?", 5, 2],
  ["Smoking?", 2, 5],
  ["Yo-yos?", 3, 4],
  ["Xbox?", 4, 3],
  ["The Simpsons?", 5, 2],
  ["Speeding?", 3, 4],
  ["South Korea?", 5, 2],
  ["Paper straws?", 2, 5],
  ["Big juicy butts?", 5, 2],
  ["Lego?", 6, 1],
  ["The number 69?", 4, 3],
  ["DC Movies?", 3, 4],
  ["Marvel Movies?", 4, 3],
  ["80s nostalgia?", 5, 2],
  ["Cocaine?", 2, 5],
  ["Music festivals?", 5, 2],
  ["Electric vehicles?", 4, 3],
  ["Craft beer?", 4, 3],
  ["Museums?", 5, 2],
  ["Gucci?", 3, 4],
  ["Six seven?", 3, 4],
  ["Chocolate?", 6, 1],
  ["Haribo?", 5, 2],
  ["Pringles?", 5, 2],
  ["Pizza?", 6, 1],
  ["Transformers?", 3, 4],
  ["Class struggle?", 3, 4],
  ["Breaking Bad?", 6, 1],
  ["Tom Cruise?", 5, 2],
  ["Cucumber?", 4, 3],
  ["Reality TV?", 3, 4],
  // Round 4 additions
  ["Running?", 4, 3],
  ["Socks with sandals?", 2, 5],
  ["Mona Lisa?", 4, 3],
  ["Dubai?", 3, 4],
  ["Palestine?", 4, 3],
  ["Ye?", 3, 4],
  ["Eiffel Tower?", 5, 2],
  ["Christmas?", 6, 1],
  ["Fossil fuels?", 1, 6],
  ["Sushi?", 5, 2],
  ["American Football?", 3, 4],
  ["Pokemon cards?", 5, 2],
  ["Cold toilet seats?", 1, 6],
  ["Bumbags?", 3, 4],
  ["Prosthetic limbs?", 5, 2],
  ["90s cartoons?", 6, 1],
  ["Flat Earth?", 1, 6],
  ["Boomers?", 2, 5],
  ["Israel?", 3, 4],
  ["4-day work week?", 6, 1],
  // Relationship & dating
  ["Checking partner's phone?", 2, 5],
  ["Posting your relationship?", 3, 4],
  ["Dating for money?", 2, 5],
  ["Liking others' selfies?", 3, 4],
  ["Moving in after 3 months?", 2, 5],
  ["Getting back with an ex?", 2, 5],
  ["Forgiving cheating?", 2, 5],
  ["Marrying for money?", 2, 5],
  ["Kids in your early 20s?", 3, 4],
  ["Not wanting kids?", 4, 3],
  ["Career over family?", 3, 4],
  // Morals & honesty
  ["Lying to avoid hurting?", 4, 3],
  ["Keeping extra change?", 4, 3],
  ["Snitching on a friend?", 2, 5],
  ["Cutting off family?", 3, 4],
  ["Pretending to like a gift?", 4, 3],
  ["Public shaming?", 2, 5],
  // Money & lifestyle
  ["£1k on a night out?", 2, 5],
  ["Designer clothes?", 3, 4],
  ["Living with parents at 30?", 3, 4],
  ["Quitting with no plan?", 3, 4],
  ["Working weekends?", 2, 5],
  ["Paying for OnlyFans?", 2, 5],
  ["Gambling for fun?", 3, 4],
  ["Crypto investing?", 3, 4],
  // Habits
  ["Double texting?", 4, 3],
  ["TikTok for hours?", 3, 4],
  ["Not returning a trolley?", 1, 6],
  ["Talking during movies?", 1, 6],
  ["Leaving people on read?", 3, 4],
  ["Phone on the toilet?", 5, 2],
  ["Sharing Netflix?", 5, 2],
  // Life choices
  ["Influencers as a job?", 2, 5],
  ["Dropping out of uni?", 3, 4],
  // Vibes & mindset
  ["Cheap thrills?", 4, 3],
  ["Main character energy?", 4, 3],
  ["High standards?", 5, 2],
  ["Monkeys?", 4, 3],
  ["Golden hour?", 5, 2],
  ["Lucky breaks?", 4, 3],
  ["No filter?", 3, 4],
  ["All in?", 5, 2],
  ["Bad decisions?", 3, 4],
  ["Work hard play hard?", 4, 3],
  ["Stay humble?", 5, 2],
  ["Winning mindset?", 5, 2],
  ["Delusional confidence?", 4, 3],
  ["Silent grind?", 5, 2],
  ["Loud success?", 3, 4],
  ["Get rich quick?", 2, 5],
  ["Side hustle culture?", 3, 4],
  ["Flashy wealth?", 2, 5],
  ["Quiet wealth?", 6, 1],
  ["Fake it till you make it?", 4, 3],
  ["Corporate ladder?", 3, 4],
  ["Early retirement?", 6, 1],
  ["People pleaser?", 3, 4],
  ["Attention seeker?", 2, 5],
  ["Overthinker?", 4, 3],
  ["Lone wolf?", 4, 3],
  ["Social butterfly?", 4, 3],
  ["Hopeless romantic?", 4, 3],
  ["Serial dater?", 2, 5],
  // Online culture
  ["Going viral?", 4, 3],
  ["Clout chasing?", 2, 5],
  ["Creator life?", 3, 4],
  ["Reply guy?", 1, 6],
  ["Chronically online?", 3, 4],
  ["Touch grass?", 5, 2],
  ["Close friends only?", 4, 3],
  ["Posting for validation?", 2, 5],
  ["Petty revenge?", 3, 4],
  ["Hot takes?", 5, 2],
  ["Unpopular opinions?", 4, 3],
  // Relatable habits
  ["Being late on purpose?", 2, 5],
  ["Reading and not replying?", 3, 4],
  ["Leaving without telling?", 3, 4],
  ["Pretending to understand?", 4, 3],
  ["Googling everything?", 5, 2],
  ["Spending too much online?", 3, 4],
  ["Impulse buying?", 3, 4],
  ["Starting then quitting?", 3, 4],
  ["Watching instead of doing?", 3, 4],
  ["Saying yes then regretting?", 4, 3],
  ["Avoiding responsibilities?", 3, 4],
  // Dating & social
  ["Office crush?", 3, 4],
  ["Flirting for fun?", 4, 3],
  ["Playing hard to get?", 3, 4],
  ["Being mysterious?", 4, 3],
  ["Testing people?", 2, 5],
  ["Stalking socials?", 3, 4],
  ["Rebounds?", 2, 5],
  ["Mixed signals?", 2, 5],
];

export interface Prompt {
  id: number;
  text: string;
  hot_votes: number;
  not_votes: number;
  created_at: string;
}

export async function initDb() {
  if (initialized) return;
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS prompts (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL UNIQUE,
      hot_votes INTEGER DEFAULT 0,
      not_votes INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS emails (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      event TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS custom_lists (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS custom_questions (
      id SERIAL PRIMARY KEY,
      list_id INTEGER NOT NULL REFERENCES custom_lists(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      text TEXT NOT NULL,
      hot_votes INTEGER DEFAULT 0,
      not_votes INTEGER DEFAULT 0
    )
  `;

  const count = await sql`SELECT COUNT(*) as c FROM prompts`;
  if (Number(count[0].c) === 0) {
    for (const [text, hot, not_] of SEED_DATA) {
      await sql`INSERT INTO prompts (text, hot_votes, not_votes) VALUES (${text}, ${hot}, ${not_}) ON CONFLICT DO NOTHING`;
    }
  }
  initialized = true;
}

export async function getRandomBatch(excludeIds: number[], count: number): Promise<Prompt[]> {
  const sql = getDb();
  if (excludeIds.length === 0) {
    const rows = await sql`SELECT * FROM prompts ORDER BY RANDOM() LIMIT ${count}`;
    return rows as unknown as Prompt[];
  }
  const rows = await sql`SELECT * FROM prompts WHERE id != ALL(${excludeIds}) ORDER BY RANDOM() LIMIT ${count}`;
  return rows as unknown as Prompt[];
}

export async function vote(id: number, isHot: boolean): Promise<Prompt | null> {
  const sql = getDb();
  if (isHot) {
    await sql`UPDATE prompts SET hot_votes = hot_votes + 1 WHERE id = ${id}`;
  } else {
    await sql`UPDATE prompts SET not_votes = not_votes + 1 WHERE id = ${id}`;
  }
  const rows = await sql`SELECT * FROM prompts WHERE id = ${id}`;
  return (rows[0] as unknown as Prompt) || null;
}

export async function getHotList(): Promise<(Prompt & { hot_pct: number })[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT *,
      CASE WHEN (hot_votes + not_votes) > 0
        THEN ROUND(hot_votes * 100.0 / (hot_votes + not_votes))
        ELSE 0
      END as hot_pct
    FROM prompts
    WHERE (hot_votes + not_votes) > 0
    ORDER BY hot_pct DESC, (hot_votes + not_votes) DESC
  `;
  return rows as unknown as (Prompt & { hot_pct: number })[];
}

export async function saveEmail(email: string): Promise<boolean> {
  const sql = getDb();
  try {
    await sql`INSERT INTO emails (email) VALUES (${email})`;
    return true;
  } catch {
    return false;
  }
}

export async function trackEvent(event: string): Promise<void> {
  const sql = getDb();
  await sql`INSERT INTO events (event) VALUES (${event})`;
}

export interface CustomQuestion {
  id: number;
  text: string;
  hot_votes: number;
  not_votes: number;
}

function makeSlug(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export async function createCustomList(questions: string[]): Promise<string> {
  const sql = getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = makeSlug();
    try {
      const rows = await sql`INSERT INTO custom_lists (slug) VALUES (${slug}) RETURNING id`;
      const listId = Number(rows[0].id);
      for (let i = 0; i < questions.length; i++) {
        await sql`
          INSERT INTO custom_questions (list_id, position, text)
          VALUES (${listId}, ${i}, ${questions[i]})
        `;
      }
      return slug;
    } catch {
      // slug collision, retry
    }
  }
  throw new Error("Failed to create list");
}

export async function getCustomList(
  slug: string
): Promise<{ slug: string; questions: CustomQuestion[] } | null> {
  const sql = getDb();
  const lists = await sql`SELECT id FROM custom_lists WHERE slug = ${slug}`;
  if (lists.length === 0) return null;
  const listId = Number(lists[0].id);
  const rows = await sql`
    SELECT id, text, hot_votes, not_votes
    FROM custom_questions
    WHERE list_id = ${listId}
    ORDER BY position ASC
  `;
  return { slug, questions: rows as unknown as CustomQuestion[] };
}

export async function voteCustom(
  questionId: number,
  isHot: boolean
): Promise<{ hotPct: number } | null> {
  const sql = getDb();
  if (isHot) {
    await sql`UPDATE custom_questions SET hot_votes = hot_votes + 1 WHERE id = ${questionId}`;
  } else {
    await sql`UPDATE custom_questions SET not_votes = not_votes + 1 WHERE id = ${questionId}`;
  }
  const rows = await sql`SELECT hot_votes, not_votes FROM custom_questions WHERE id = ${questionId}`;
  if (rows.length === 0) return null;
  const hot = Number(rows[0].hot_votes);
  const not_ = Number(rows[0].not_votes);
  const total = hot + not_;
  const hotPct = total > 0 ? Math.round((hot / total) * 100) : 0;
  return { hotPct };
}

export async function getAdminStats() {
  const sql = getDb();

  const emails = await sql`SELECT id, email, created_at FROM emails ORDER BY created_at DESC`;

  const totalVotes = await sql`SELECT SUM(hot_votes + not_votes) as total FROM prompts`;

  const todayHits = await sql`
    SELECT COUNT(*) as count FROM events
    WHERE event = 'page_view' AND created_at >= CURRENT_DATE
  `;

  const totalHits = await sql`
    SELECT COUNT(*) as count FROM events WHERE event = 'page_view'
  `;

  const shareClicks = await sql`
    SELECT COUNT(*) as count FROM events WHERE event = 'share_click'
  `;

  const todayShares = await sql`
    SELECT COUNT(*) as count FROM events
    WHERE event = 'share_click' AND created_at >= CURRENT_DATE
  `;

  const totalVideos = await sql`
    SELECT COUNT(*) as count FROM events WHERE event = 'video_made'
  `;

  const todayVideos = await sql`
    SELECT COUNT(*) as count FROM events
    WHERE event = 'video_made' AND created_at >= CURRENT_DATE
  `;

  const dailyHits = await sql`
    SELECT DATE(created_at) as day, COUNT(*) as count
    FROM events WHERE event = 'page_view'
    GROUP BY DATE(created_at)
    ORDER BY day DESC
    LIMIT 30
  `;

  return {
    emails: emails as unknown as { id: number; email: string; created_at: string }[],
    totalVotes: Number(totalVotes[0]?.total || 0),
    todayHits: Number(todayHits[0]?.count || 0),
    totalHits: Number(totalHits[0]?.count || 0),
    shareClicks: Number(shareClicks[0]?.count || 0),
    todayShares: Number(todayShares[0]?.count || 0),
    totalVideos: Number(totalVideos[0]?.count || 0),
    todayVideos: Number(todayVideos[0]?.count || 0),
    dailyHits: dailyHits as unknown as { day: string; count: number }[],
  };
}
