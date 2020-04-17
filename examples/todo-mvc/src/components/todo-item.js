import { Component } from 'preact';
import { observe } from 'parket/preact';
import cls from 'clsx';

import { TodoTextInput } from './todo-text-input';

@observe
export class TodoItem extends Component {
  state = {
    editing: false,
  };

  handleDoubleClick = () => {
    this.setState({ editing: true });
  };

  handleSave = (id, text) => {
    const { todo } = this.props;
    if (text.length === 0) {
      todo.remove();
    } else {
      todo.edit(text);
    }
    this.setState({ editing: false });
  };

  render() {
    const { todo } = this.props;

    let element;
    if (this.state.editing) {
      element = (
        <TodoTextInput
          text={todo.text}
          editing={this.state.editing}
          onSave={(text) => this.handleSave(todo.id, text)}
        />
      );
    } else {
      element = (
        <div className="view">
          <input
            className="toggle"
            type="checkbox"
            checked={todo.completed}
            onChange={() => todo.complete()}
          />
          <label onDblClick={this.handleDoubleClick}>{todo.text}</label>
          <button className="destroy" onClick={() => todo.remove()} />
        </div>
      );
    }

    return (
      <li
        className={cls({
          completed: todo.completed,
          editing: this.state.editing,
        })}
      >
        {element}
      </li>
    );
  }
}
