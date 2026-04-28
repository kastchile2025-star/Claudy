import fs from 'fs';
import path from 'path';
import os from 'os';

export interface Skill {
  name: string;
  description: string;
  path: string;
  content: string;
}

const SKILLS_DIR = path.join(os.homedir(), '.claudy', 'skills');

export function getSkillsDir(): string {
  if (!fs.existsSync(SKILLS_DIR)) {
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
  }
  return SKILLS_DIR;
}

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      meta[key] = value;
    }
  }
  return { meta, body: match[2] };
}

export function listSkills(): Skill[] {
  const dir = getSkillsDir();
  const skills: Skill[] = [];

  for (const entry of fs.readdirSync(dir)) {
    const skillDir = path.join(dir, entry);
    if (!fs.statSync(skillDir).isDirectory()) continue;

    const skillFile = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    try {
      const content = fs.readFileSync(skillFile, 'utf-8');
      const { meta, body } = parseFrontmatter(content);
      skills.push({
        name: meta.name || entry,
        description: meta.description || body.split('\n')[0].slice(0, 100),
        path: skillFile,
        content: body,
      });
    } catch {
      // skip
    }
  }

  return skills;
}

export function getSkill(name: string): Skill | null {
  return listSkills().find((s) => s.name === name) || null;
}

export function saveSkillFromContent(name: string, content: string): string {
  const dir = getSkillsDir();
  const skillDir = path.join(dir, name);
  fs.mkdirSync(skillDir, { recursive: true });
  const filePath = path.join(skillDir, 'SKILL.md');
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

export function removeSkill(name: string): boolean {
  const dir = getSkillsDir();
  const skillDir = path.join(dir, name);
  if (!fs.existsSync(skillDir)) return false;
  fs.rmSync(skillDir, { recursive: true, force: true });
  return true;
}

// Match simple por keywords
export function findRelevantSkills(query: string, max = 3): Skill[] {
  const skills = listSkills();
  const q = query.toLowerCase();

  const scored = skills.map((skill) => {
    const text = (skill.name + ' ' + skill.description + ' ' + skill.content).toLowerCase();
    const words = q.split(/\s+/).filter((w) => w.length > 3);
    let score = 0;
    for (const w of words) {
      if (text.includes(w)) score++;
    }
    return { skill, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.skill);
}

export function buildSkillsContext(skills: Skill[]): string {
  if (skills.length === 0) return '';
  return (
    '\n\n=== SKILLS RELEVANTES ===\n' +
    skills
      .map((s) => `[Skill: ${s.name}]\n${s.content.slice(0, 4000)}`)
      .join('\n\n---\n\n') +
    '\n=== FIN SKILLS ==='
  );
}
