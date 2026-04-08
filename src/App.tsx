import React, { useState, useEffect } from 'react';
import { useState, useEffect, type FormEvent } from 'react';
import { Book, Plus, BarChart2, Target, Flame, PieChart, Edit3, Trash2, CheckCircle, BookOpen } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];
const COVER_COLORS = [
  { value: 'bg-slate-700', label: 'Slate' },
  { value: 'bg-red-700', label: 'Red' },
  { value: 'bg-orange-700', label: 'Orange' },
  { value: 'bg-amber-700', label: 'Amber' },
  { value: 'bg-emerald-700', label: 'Emerald' },
  { value: 'bg-cyan-700', label: 'Cyan' },
  { value: 'bg-blue-700', label: 'Blue' },
  { value: 'bg-indigo-700', label: 'Indigo' },
  { value: 'bg-violet-700', label: 'Violet' },
  { value: 'bg-fuchsia-700', label: 'Fuchsia' },
  { value: 'bg-rose-700', label: 'Rose' },
];

export default function App() {
  const [books, setBooks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ yearly_goal: 12 });
  const [loading, setLoading] = useState(true);
  
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [selectedBookToLog, setSelectedBookToLog] = useState<any>(null);

  // Form states
  const [bookForm, setBookForm] = useState({
    title: '', author: '', cover_color: 'bg-slate-700', total_pages: '', read_pages: '', genre: '', status: 'to-read'
  });
  const [logForm, setLogForm] = useState({
    pages_read: '', date: format(new Date(), 'yyyy-MM-dd')
  });
  const [goalForm, setGoalForm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, logsRes, settingsRes] = await Promise.all([
        fetch('/api/books'),
        fetch('/api/logs'),
        fetch('/api/settings')
      ]);
      
      if (booksRes.ok) setBooks(await booksRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings(s);
        setGoalForm(s.yearly_goal.toString());
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBook = async (e: FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingBook;
    const url = '/api/books';
    const method = isEdit ? 'PUT' : 'POST';
    
    // Auto-update status based on pages
    let status = bookForm.status;
    const read = parseInt(bookForm.read_pages) || 0;
    const total = parseInt(bookForm.total_pages) || 1;
    
    if (read >= total) status = 'completed';
    else if (read > 0 && status === 'to-read') status = 'reading';

    const payload = {
      ...bookForm,
      total_pages: total,
      read_pages: read,
      status,
      id: isEdit ? editingBook.id : undefined
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsAddingBook(false);
        setEditingBook(null);
        fetchData();
      }
    } catch (err) {
      console.error('Failed to save book', err);
    }
  };

  const handleDeleteBook = async (id: number) => {
    if (!confirm('Are you sure you want to delete this book?')) return;
    try {
      await fetch('/api/books', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchData();
    } catch (err) {
      console.error('Failed to delete book', err);
    }
  };

  const handleSaveLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBookToLog) return;

    const pagesRead = parseInt(logForm.pages_read);
    if (!pagesRead || pagesRead <= 0) return;

    try {
      // 1. Save the log
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: selectedBookToLog.id,
          date: logForm.date,
          pages_read: pagesRead
        })
      });

      // 2. Update book progress
      const newReadPages = Math.min((selectedBookToLog.read_pages || 0) + pagesRead, selectedBookToLog.total_pages);
      let newStatus = selectedBookToLog.status;
      if (newReadPages >= selectedBookToLog.total_pages) newStatus = 'completed';
      else if (newStatus === 'to-read') newStatus = 'reading';

      await fetch('/api/books', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedBookToLog,
          read_pages: newReadPages,
          status: newStatus
        })
      });

      setIsLogging(false);
      setSelectedBookToLog(null);
      setLogForm({ pages_read: '', date: format(new Date(), 'yyyy-MM-dd') });
      fetchData();
    } catch (err) {
      console.error('Failed to save log', err);
    }
  };

  const handleUpdateGoal = async (e: FormEvent) => {
    e.preventDefault();
    const goal = parseInt(goalForm);
    if (!goal || goal <= 0) return;
    
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearly_goal: goal })
      });
      fetchData();
    } catch (err) {
      console.error('Failed to update goal', err);
    }
  };

  const openEditBook = (book: any) => {
    setEditingBook(book);
    setBookForm({
      title: book.title,
      author: book.author,
      cover_color: book.cover_color,
      total_pages: book.total_pages.toString(),
      read_pages: book.read_pages.toString(),
      genre: book.genre,
      status: book.status
    });
    setIsAddingBook(true);
  };

  const openAddBook = () => {
    setEditingBook(null);
    setBookForm({
      title: '', author: '', cover_color: 'bg-slate-700', total_pages: '', read_pages: '0', genre: '', status: 'to-read'
    });
    setIsAddingBook(true);
  };

  const openLogSession = (book: any) => {
    setSelectedBookToLog(book);
    setIsLogging(true);
  };

  // Derived Statistics
  const completedBooksCount = books.filter(b => b.status === 'completed').length;
  const readingBooksCount = books.filter(b => b.status === 'reading').length;
  
  // Genre Breakdown
  const genreData = books.reduce((acc: any[], book) => {
    if (!book.genre) return acc;
    const existing = acc.find(g => g.name === book.genre);
    if (existing) existing.value += 1;
    else acc.push({ name: book.genre, value: 1 });
    return acc;
  }, []);

  // Pages Read Over Time (Last 14 days)
  const chartData = [];
  let currentStreak = 0;
  
  for (let i = 13; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const logsOnDate = logs.filter(l => l.date === dateStr);
    const totalPages = logsOnDate.reduce((sum, l) => sum + l.pages_read, 0);
    
    chartData.push({
      name: format(d, 'MMM dd'),
      pages: totalPages
    });

    if (totalPages > 0) {
      currentStreak++;
    } else if (i > 0) { // Don't reset streak if today is 0 and we haven't read yet
      currentStreak = 0;
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><div className="animate-spin text-stone-400"><Book size={32} /></div></div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-xl">
            <Book className="text-amber-600" />
            <span>LitTracker</span>
          </div>
          <button 
            onClick={openAddBook}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
          >
            <Plus size={16} /> Add Book
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        
        {/* Dashboard Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-lg text-amber-600">
              <Target size={24} />
            </div>
            <div>
              <p className="text-sm text-stone-500 font-medium">Yearly Goal</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold">{completedBooksCount} <span className="text-stone-400 text-lg">/ {settings.yearly_goal}</span></h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
            <div className="bg-orange-100 p-3 rounded-lg text-orange-600">
              <Flame size={24} />
            </div>
            <div>
              <p className="text-sm text-stone-500 font-medium">Reading Streak</p>
              <h3 className="text-2xl font-bold">{currentStreak} <span className="text-stone-400 text-lg font-normal">days</span></h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-lg text-blue-600">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-sm text-stone-500 font-medium">Currently Reading</p>
              <h3 className="text-2xl font-bold">{readingBooksCount}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex items-center gap-4">
            <div className="bg-emerald-100 p-3 rounded-lg text-emerald-600">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-stone-500 font-medium">Total Completed</p>
              <h3 className="text-2xl font-bold">{completedBooksCount}</h3>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <BarChart2 className="text-stone-400" size={20} />
              <h2 className="text-lg font-semibold">Pages Read (Last 14 Days)</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#78716c', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#78716c', fontSize: 12}} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="pages" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorPages)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="text-stone-400" size={20} />
              <h2 className="text-lg font-semibold">Genres</h2>
            </div>
            <div className="h-64">
              {genreData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={genreData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genreData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-stone-400">No genre data yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Library */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-stone-800">Your Library</h2>
          </div>

          {/* Currently Reading */}
          {books.filter(b => b.status === 'reading').length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Currently Reading</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.filter(b => b.status === 'reading').map(book => (
                  <BookCard 
                    key={book.id} 
                    book={book} 
                    onEdit={() => openEditBook(book)} 
                    onDelete={() => handleDeleteBook(book.id)}
                    onLog={() => openLogSession(book)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* To Read */}
          {books.filter(b => b.status === 'to-read').length > 0 && (
            <div className="space-y-4 mt-8">
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Up Next</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.filter(b => b.status === 'to-read').map(book => (
                  <BookCard 
                    key={book.id} 
                    book={book} 
                    onEdit={() => openEditBook(book)} 
                    onDelete={() => handleDeleteBook(book.id)}
                    onLog={() => openLogSession(book)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {books.filter(b => b.status === 'completed').length > 0 && (
            <div className="space-y-4 mt-8">
              <h3 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Completed</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 hover:opacity-100 transition-opacity">
                {books.filter(b => b.status === 'completed').map(book => (
                  <BookCard 
                    key={book.id} 
                    book={book} 
                    onEdit={() => openEditBook(book)} 
                    onDelete={() => handleDeleteBook(book.id)}
                    onLog={() => openLogSession(book)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Goal Settings Form */}
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm max-w-md">
          <h3 className="text-lg font-semibold mb-4">Settings</h3>
          <form onSubmit={handleUpdateGoal} className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-500 mb-1">Yearly Reading Goal</label>
              <input 
                type="number" 
                value={goalForm}
                onChange={e => setGoalForm(e.target.value)}
                className="w-full border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="bg-stone-800 text-white px-4 py-2 rounded-md hover:bg-stone-700">Update</button>
            </div>
          </form>
        </div>

      </main>

      {/* Modals */}
      
      {/* Add/Edit Book Modal */}
      {isAddingBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
            <form onSubmit={handleSaveBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title *</label>
                <input required type="text" value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} className="w-full border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Author *</label>
                <input required type="text" value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} className="w-full border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Total Pages *</label>
                  <input required type="number" min="1" value={bookForm.total_pages} onChange={e => setBookForm({...bookForm, total_pages: e.target.value})} className="w-full border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Pages Read</label>
                  <input type="number" min="0" value={bookForm.read_pages} onChange={e => setBookForm({...bookForm, read_pages: e.target.value})} className="w-full border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Genre</label>
                  <input type="text" value={bookForm.genre} onChange={e => setBookForm({...bookForm, genre: e.target.value})} className="w-full border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
                  <select value={bookForm.status} onChange={e => setBookForm({...bookForm, status: e.target.value})} className="w-full border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="to-read">To Read</option>
                    <option value="reading">Reading</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">Cover Color</label>
                <div className="flex flex-wrap gap-2">
                  {COVER_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setBookForm({...bookForm, cover_color: c.value})}
                      className={`w-8 h-8 rounded-full ${c.value} ${bookForm.cover_color === c.value ? 'ring-2 ring-offset-2 ring-stone-800' : ''}`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsAddingBook(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700">Save Book</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Reading Modal */}
      {isLogging && selectedBookToLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-xl font-bold mb-1">Log Reading</h2>
            <p className="text-stone-500 text-sm mb-4">{selectedBookToLog.title}</p>
            
            <div className="mb-4 bg-stone-100 p-3 rounded-lg flex justify-between items-center text-sm">
              <span className="text-stone-600">Current Progress:</span>
              <span className="font-semibold">{selectedBookToLog.read_pages} / {selectedBookToLog.total_pages}</span>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Pages Read Today *</label>
                <input 
                  required 
                  type="number" 
                  min="1" 
                  max={selectedBookToLog.total_pages - (selectedBookToLog.read_pages || 0)}
                  value={logForm.pages_read} 
                  onChange={e => setLogForm({...logForm, pages_read: e.target.value})} 
                  className="w-full border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg" 
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                <input 
                  required 
                  type="date" 
                  value={logForm.date} 
                  onChange={e => setLogForm({...logForm, date: e.target.value})} 
                  className="w-full border border-stone-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500" 
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsLogging(false)} className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function BookCard({ book, onEdit, onDelete, onLog }: { book: any, onEdit: () => void, onDelete: () => void, onLog: () => void }) {
  const progress = book.total_pages > 0 ? Math.min(100, Math.round((book.read_pages / book.total_pages) * 100)) : 0;
  
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col group">
      <div className="p-4 flex gap-4">
        {/* Spine / Cover representation */}
        <div className={`w-20 h-28 rounded-md shadow-md flex-shrink-0 ${book.cover_color || 'bg-slate-700'} relative overflow-hidden flex items-center justify-center`}>
          <div className="absolute left-1 top-0 bottom-0 w-1 bg-black/10"></div>
          <span className="text-white/20 font-serif text-3xl font-bold -rotate-90 select-none whitespace-nowrap">{book.title.substring(0,2)}</span>
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-stone-900 leading-tight truncate-2-lines" title={book.title}>{book.title}</h3>
            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={onEdit} className="p-1 text-stone-400 hover:text-blue-600"><Edit3 size={14} /></button>
              <button onClick={onDelete} className="p-1 text-stone-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
          <p className="text-sm text-stone-500 mb-1 truncate" title={book.author}>{book.author}</p>
          {book.genre && <span className="inline-block px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded-full w-max mt-1">{book.genre}</span>}
          
          <div className="mt-auto pt-4">
            <div className="flex justify-between text-xs text-stone-500 mb-1">
              <span>{progress}%</span>
              <span>{book.read_pages} / {book.total_pages} p</span>
            </div>
            <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
      
      {book.status !== 'completed' && (
        <div className="border-t border-stone-100 bg-stone-50 p-2 flex justify-end">
          <button 
            onClick={onLog}
            className="text-sm font-medium text-amber-700 hover:text-amber-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-amber-100 transition-colors"
          >
            <Plus size={14} /> Log Reading
          </button>
        </div>
      )}
    </div>
  );
}
