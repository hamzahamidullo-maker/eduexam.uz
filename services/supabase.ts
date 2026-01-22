
/**
 * Mock Supabase Service using LocalStorage
 * This allows the app to work entirely client-side without a real backend.
 */

const STORAGE_KEYS = {
  EXAMS: 'eduexam_db_exams',
  ATTEMPTS: 'eduexam_db_attempts',
  SESSIONS: 'eduexam_db_sessions'
};

const getStore = (key: string): any[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveStore = (key: string, data: any[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Initialize empty stores if not present
Object.values(STORAGE_KEYS).forEach(key => {
  if (!localStorage.getItem(key)) localStorage.setItem(key, '[]');
});

/**
 * Mock Builder for Supabase-like syntax
 */
class MockQueryBuilder {
  private table: string;
  private filters: ((item: any) => boolean)[] = [];
  private sortField: string | null = null;
  private sortAscending: boolean = true;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(query: string = '*') {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push(item => item[column] === value);
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.sortField = column;
    this.sortAscending = ascending;
    return this;
  }

  insert(payload: any) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.action = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  private async execute() {
    const key = Object.values(STORAGE_KEYS).find(v => v.endsWith(this.table))!;
    let store = getStore(key);

    if (this.action === 'insert') {
      const newItems = Array.isArray(this.payload) ? this.payload : [this.payload];
      const processedItems = newItems.map(item => ({
        ...item,
        id: item.id || Math.random().toString(36).substr(2, 9),
        created_at: item.created_at || new Date().toISOString()
      }));
      const updatedStore = [...store, ...processedItems];
      saveStore(key, updatedStore);
      return { 
        data: Array.isArray(this.payload) ? processedItems : processedItems[0], 
        error: null 
      };
    }

    if (this.action === 'update') {
      const updatedStore = store.map(item => {
        let matches = true;
        this.filters.forEach(filter => { if (!filter(item)) matches = false; });
        if (matches) {
          return { ...item, ...this.payload };
        }
        return item;
      });
      saveStore(key, updatedStore);
      return { data: null, error: null };
    }

    if (this.action === 'delete') {
      const updatedStore = store.filter(item => {
        let matches = true;
        this.filters.forEach(filter => { if (!filter(item)) matches = false; });
        return !matches; // Keep those that DON'T match the filters
      });
      saveStore(key, updatedStore);
      return { data: null, error: null };
    }

    // Default: select
    let result = [...store];
    this.filters.forEach(filter => {
      result = result.filter(filter);
    });

    if (this.sortField) {
      result.sort((a, b) => {
        const valA = a[this.sortField!];
        const valB = b[this.sortField!];
        if (valA < valB) return this.sortAscending ? -1 : 1;
        if (valA > valB) return this.sortAscending ? 1 : -1;
        return 0;
      });
    }

    return { data: result, error: null };
  }

  async then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    try {
      const res = await this.execute();
      resolve(res);
    } catch (e) {
      if (reject) reject(e);
      else throw e;
    }
  }

  async single() {
    const { data, error } = await this.execute();
    return { 
      data: Array.isArray(data) ? data[0] : (data || null), 
      error 
    };
  }
}

// Mock Supabase Client
export const supabase = {
  from: (table: string) => new MockQueryBuilder(table),
  channel: () => ({
    on: () => ({ subscribe: () => ({}) }),
    subscribe: () => ({})
  }),
  removeChannel: () => {}
} as any;

export type DbExam = {
  id: string;
  short_code: string;
  title: string;
  month: number;
  mode: string;
  duration_minutes: number;
  questions_json: any;
  created_at: string;
};

export type DbAttempt = {
  id: string;
  exam_short_code: string;
  first_name: string;
  last_name: string;
  started_at: string;
  submitted_at: string | null;
  score: number;
  correct_count: number;
  wrong_count: number;
  answers_json: any;
  status: 'in_progress' | 'finished' | 'timeout';
};

export type DbSession = {
  id: string;
  join_code: string;
  exam_short_code: string;
  status: 'active' | 'ended';
  created_at: string;
};
