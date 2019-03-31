import model from 'parket';

export const SHOW_ALL = 'show_all';
export const SHOW_COMPLETED = 'show_completed';
export const SHOW_ACTIVE = 'show_active';

// const filterType = types.union(...[SHOW_ALL, SHOW_COMPLETED, SHOW_ACTIVE].map(types.literal))
const TODO_FILTERS = {
  [SHOW_ALL]: () => true,
  [SHOW_ACTIVE]: todo => !todo.completed,
  [SHOW_COMPLETED]: todo => todo.completed,
};

const Todo = model('Todo', {
  initial: () => ({
    text: '',
    completed: false,
    id: 0,
  }),
  actions: self => ({
    remove: () => self.getRoot().removeTodo(self),
    edit: text => (self.text = text),
    complete: () => (self.completed = !self.completed),
  }),
});

const TodoStore = model('TodoStore', {
  initial: () => ({
    todos: [],
    filter: SHOW_ALL,
  }),
  views: self => ({
    completedCount: () =>
      self.todos.reduce(
        (count, todo) => (todo.completed ? count + 1 : count),
        0
      ),
    activeCount: () => self.todos.length - self.completedCount,
    filteredTodos: () => self.todos.filter(TODO_FILTERS[self.filter]),
  }),
  actions: self => ({
    addTodo: text =>
      self.todos.unshift(
        Todo({
          text,
          id:
            self.todos.reduce((maxId, todo) => Math.max(todo.id, maxId), -1) +
            1,
        })
      ),
    removeTodo: todo => self.todos.splice(self.todos.indexOf(todo) >>> 0, 1),
    completeAll: () => {
      const areAllMarked = self.todos.every(todo => todo.completed);
      self.todos.forEach(todo => (todo.completed = !areAllMarked));
    },
    clearCompleted: () =>
      self.todos
        .filter(todo => todo.completed)
        .forEach(todo => self.removeTodo(todo)),
    setFilter: filter => (self.filter = filter),
  }),
});

export default TodoStore;
