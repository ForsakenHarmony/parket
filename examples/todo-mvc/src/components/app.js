import { Header } from './header';
import { MainSection } from './main-section';

export const App = ({ store }) => (
  <div class="todoapp">
    <Header addTodo={store.addTodo} />
    <MainSection store={store} />
  </div>
);
