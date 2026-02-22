const PERSON_KEY = 'terrain_person_id';

export function getOrCreatePersonId(): string {
  if (typeof window === 'undefined') {
    return `person_${Date.now()}`;
  }

  const existing = localStorage.getItem(PERSON_KEY);
  if (existing) return existing;

  const personId = `person_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(PERSON_KEY, personId);
  return personId;
}

export function getPersonId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PERSON_KEY);
}

export function clearPersonId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PERSON_KEY);
}
