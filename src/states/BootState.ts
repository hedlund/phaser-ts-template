/**
 * The BootState is responsible for preloading the loadbar, and then
 * configuring the global settings, such as scale, etc.
 */
export default class BootState extends Phaser.State {

    public preload(): void {
		this.load.image('loadbar', 'assets/images/loadbar.png');
	}

    public create(): void {
        // Set the background color
        this.stage.backgroundColor = '#000';

		// Prevent the browser from pausing the game (and it's timers) if the tab loses focus
		this.stage.disableVisibilityChange = true;

		// Scale on all devices
		this.scale.pageAlignHorizontally = true;
		this.scale.pageAlignVertically = true;
		this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;

		// Other typical settings
		//this.stage.scale.minWidth = 480;
		//this.stage.scale.minHeight = 260;
		//this.stage.scale.maxWidth = 1024;
		//this.stage.scale.maxHeight = 768;
		//this.stage.scale.forceLandscape = true;
		//this.stage.scale.setScreenSize(true);
		//this.input.maxPointers = 1;

		// Start the loader state
        this.game.state.start('loader');
	}
}
