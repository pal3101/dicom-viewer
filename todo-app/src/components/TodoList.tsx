import { useState, useEffect } from 'react';
import { db } from '../lib/cloudbase';

interface Todo {
  _id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // 添加待办事项
  const addTodo = async () => {
    if (!newTitle.trim()) return;
    try {
      const result = await db.collection('todos').add({
        title: newTitle.trim(),
        completed: false,
        createdAt: Date.now(),
      });
      // result._id 是新创建的文档 ID
      const newId = (result as unknown as { _id: string })._id;
      setTodos(prev => [{
        _id: newId,
        title: newTitle.trim(),
        completed: false,
        createdAt: Date.now(),
      }, ...prev]);
      setNewTitle('');
    } catch (err) {
      console.error('添加失败:', err);
    }
  };

  // 切换完成状态
  const toggleTodo = async (id: string, completed: boolean) => {
    try {
      await db.collection('todos').doc(id).update({
        completed: !completed,
      });
      setTodos(prev =>
        prev.map(t => t._id === id ? { ...t, completed: !completed } : t)
      );
    } catch (err) {
      console.error('更新失败:', err);
    }
  };

  // 删除待办事项
  const deleteTodo = async (id: string) => {
    try {
      await db.collection('todos').doc(id).remove();
      setTodos(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      console.error('删除失败:', err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await db.collection('todos')
          .orderBy('createdAt', 'desc')
          .get();
        if (!cancelled) setTodos(result.data as Todo[]);
      } catch (err) {
        if (!cancelled) console.error('加载失败:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="todo-container">
      <h1>待办事项</h1>

      <div className="add-form">
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="添加新任务..."
        />
        <button onClick={addTodo}>添加</button>
      </div>

      <ul className="todo-list">
        {todos.map(todo => (
          <li key={todo._id} className={todo.completed ? 'completed' : ''}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo._id, todo.completed)}
            />
            <span className="title">{todo.title}</span>
            <button className="delete" onClick={() => deleteTodo(todo._id)}>
              删除
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && (
        <p className="empty">暂无待办事项</p>
      )}
    </div>
  );
}
