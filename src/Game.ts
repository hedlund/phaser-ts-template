import BootState from './states/BootState';
import LoaderState from './states/LoaderState';
import MainState from './states/MainState';

class Game extends Phaser.Game {

	constructor() {
		super(800, 600, Phaser.AUTO, null, null);
		this.state.add('boot', BootState, false);
		this.state.add('loader', LoaderState, false);
		this.state.add('main', MainState, false);
		this.state.start('boot');
	}

}

new Game();
