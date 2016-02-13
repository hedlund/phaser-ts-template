/**
 * The MainState is where the actual game should begin.
 * In this simple example we're just disaplying a Phaser logo.
 */
export default class MainState extends Phaser.State {

	create() {
		let logo = this.add.sprite(this.world.centerX, this.world.centerY, 'phaser');
		logo.anchor.set(0.5);
	}

}
