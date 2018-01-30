import Header from './header';
import MainSection from './main-section';

const App = ({ store }) => (
  <div class="todoapp">
    <Header addTodo={store.addTodo} />
    <MainSection store={store} />
  </div>
);

export default App;
