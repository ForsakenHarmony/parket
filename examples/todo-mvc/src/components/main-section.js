import { Component } from 'preact';
import { observe } from 'parket/preact';
import TodoItem from './todo-item';
import Footer from './footer';

@observe
export default class MainSection extends Component {
  handleClearCompleted = () => {
    this.props.store.clearCompleted();
  };

  renderToggleAll() {
    const { store } = this.props;
    if (store.todos.length > 0) {
      return (
        <span>
          <input
            class="toggle-all"
            id="toggle-all"
            type="checkbox"
            checked={store.completedCount === store.todos.length}
            onChange={() => store.completeAll()}
          />
          <label for="toggle-all">Mark all as complete</label>
        </span>
      );
    }
  }

  renderFooter(completedCount) {
    const { store } = this.props;

    if (store.todos.length) {
      return <Footer store={store} />;
    }
  }

  render() {
    const { filteredTodos } = this.props.store;

    return (
      <section class="main">
        {this.renderToggleAll()}
        <ul class="todo-list">
          {filteredTodos.map(todo => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </ul>
        {this.renderFooter()}
      </section>
    );
  }
}
