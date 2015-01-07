function Player(name, tanksArray) {
    this.name = name;
    this.tanksArray = tanksArray;

    this.currentTankIndex = -1;
    this.turn = false;

    //Methods
    this.NextTank = function () {
        ++this.currentTankIndex;
        if (this.currentTankIndex >= this.tanksArray.length)
            this.currentTankIndex = 0;

        return this.tanksArray[this.currentTankIndex];
    };

    this.GetCurrentTank = function () {
        return this.tanksArray[this.currentTankIndex];
    };

    this.Update = function () {
        for (var i = 0; i < this.tanksArray.length; i++)
            this.tanksArray[i].Update();
    };
};