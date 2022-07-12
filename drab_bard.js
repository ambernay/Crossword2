(async () => { // This is an async iife covfefe

/* #region - read words and clues file */
    async function readFile(file) {
        let content = await fetch(file);
        return content.text()
    }

    let crosswordText = await readFile('words_and_clues.txt');
    const content = main(crosswordText);

    function parseCrossword(data) {
        let title = "Untitled";
        let acrossWordList = [];
        let rows = data.split('\n');
        let letters = [];
        let acrossHints = [];
        let downHints = [];

        while (rows.length > 0) {
            let row = rows.shift().trim();

            // ------------- TITLE --------------------------------------
            // default is 'Untitled'
            if (row[0] === "*") { 
                title = row.slice(
                    row.indexOf('*') + 1,
                    row.lastIndexOf('*'),
                );
            }
            // ------------- Crossword Grid --------------------------------------
            if (row === 'across_clues:') break;
            if (row.trim().length === 0) continue; // skip blank rows
            if (row[0] === "*") continue; // skip title

            // array of letters for placing the cells
            letters = letters.concat(Array.from(row));

            // ------------- ACROSS WORDS --------------------------------------
            // removes duplicate, consequtive dashes, then splits on dash
            let acrossWords = row.replace(/([_])\1+/g, '$1').split("_");
            // appends rows to array and filters for empty strings
            acrossWordList = acrossWordList.concat(acrossWords.filter(acrossWord => acrossWord != ""));
        }

        // ----------------- CLUES -------------------------------------------
        //ACROSS
        while (rows.length > 0) {
            let row = rows.shift().trim();

            if (row === 'down_clues:') break;
            if (row.trim().length === 0) continue;

            // Turn \\n into \n in hints
            row = row.replaceAll('\\n', '\n');

            acrossHints.push(row);
        }
        // DOWN
        while (rows.length > 0) {
            let row = rows.shift().trim();

            if (row.trim().length === 0) continue;

            downHints.push(row)
        }

        return {
            'titleText': title,
            'answer_key': letters,
            'across_word_key': acrossWordList, 
            'across_clues': acrossHints,
            'down_clues': downHints
        }
    }

    function main(crosswordText) {
        let content = parseCrossword(crosswordText);
        const rowLength = Math.sqrt(content.answer_key.length);

        // function generates divs(cells and inputs) from answer_key
        addCells(content.answer_key, rowLength);
        addClues(content.across_clues, content.down_clues, rowLength);
        addHeading();
        addTitle(content.titleText);
        // button event listener
        let button = document.querySelector('button');
        button.addEventListener('mousedown', validation); // sets highlights for answer validation
        button.addEventListener('mouseup', () => { // resets all highlights
            let allInputs = document.querySelectorAll('input');
            allInputs.forEach(letters => (letters.setAttribute('highlight', 'None')));
        });

        return content
    }
/* #endregion - read words and clues file*/


/* #region - Generate webpage */
    function addHeading(){
        var head = document.querySelector(".header");

        // get date
        var options = {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        };

        var today = (new Date()).toLocaleDateString("en-US", options);

        var heading = document.createElement('h3');
        heading.textContent = "Toronto - On " + today;

        head.appendChild(heading);
    }

    function addTitle(titleText){

        const title = document.createElement('h2');
        const titleDiv = document.querySelector('.titleDiv');
        title.textContent = titleText;
        title.className = 'title';

        titleDiv.appendChild(title);
    }

    function addCells(answer_key, rowLength) {
        var labelNum = 1;

        var form = document.querySelector('#x_grid');
        form.setAttribute("dirState", "horizontal"); // maybe add to body instead

        // creates a cell div for every letter in the answer key
        var cell_idx = 0;
        for (a in answer_key) {
            var cell = document.createElement('div');
            cell.setAttribute('cell_pos', cell_idx);
            cell_idx += 1;
    
            if (answer_key[a] != "_") {
                cell.className = 'cell';
                // highlight on mouse over
                cell.addEventListener('mouseenter', inputMouseEnter);
                cell.addEventListener('mouseleave', inputMouseLeave);
                // creates an input for every active cell
                create_inputs(cell, answer_key[a], labelNum);
            }
            // accounts for spaces between words
            else {
                cell.className = 'cell black';
            }
            form.appendChild(cell);
        }
        // identify cells for labels
        // first row(0 to rowLength-1), first column(% rowLength), 
        // and every cell adjecent or below a black cell
        let cells = document.querySelectorAll('.cell');

        for (c in cells) {
            var cell = cells[c];
            var prevCell = cell.previousSibling;
            var prevRow = cells[c - rowLength];
            // cell gets a label if is in first row or after a black cell 
            if ((c < rowLength || c % rowLength === 0 || $(prevCell).hasClass('black')
                || $(prevRow).hasClass('black')) && !$(cell).hasClass('black')) {

                labelNum = create_cross_labels(cell, labelNum);
            }
        }
    }

    function create_inputs(cell, answer_key) {
        var input = document.createElement('input');
        input.setAttribute ('name', answer_key);
        input.setAttribute('maxlength','1');
        input.setAttribute('autocomplete', 'off');
        input.setAttribute("input_pos", cell.getAttribute('cell_pos'));
        input.setAttribute('highlight', 'None');
        input.setAttribute('is_complete', 'empty');
    /* #region - event listeners */
        input.addEventListener('focus', focusInput);
        input.addEventListener('blur', (e) => {blurInput(e)});
        input.addEventListener('input', (e) => {
            markComplete(e);
        });
        // change direction state on dbl click
        input.addEventListener('dblclick', (e) => {changeDir(e)});
        // key navigation
        input.addEventListener('keypress', (e) =>{ 
            // Push this event to the end of the queue so that our 'input' listener occurs first.
            setTimeout(() => { nav(e); }, 0);
        });

        input.addEventListener('keydown', (e) => {

            // Run the nav function for arrow keys, which don't trigger keypress events
            // We use e.code here because Space doesn't have a key
            let navigationKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Space', 'Delete', 'Backspace', 'Enter']
            if(navigationKeys.includes(e.code)) {
                setTimeout(() => { nav(e); }, 0);
            }

            // suppress other keys
            let acceptedChar = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z', 'Backspace', 'Delete'];
            if (!acceptedChar.includes(e.key)) e.preventDefault();

        });


    /* #endregion - event listeners */
    
        cell.appendChild(input);
    }

    function create_cross_labels(cell, labelNum) {

        var xLabel = document.createElement('div');
        xLabel.textContent = labelNum; xLabel.className = 'cross_label';
        xLabel.setAttribute('x_label', labelNum);
        
        cell.appendChild(xLabel);
        
        return labelNum += 1
    }

    function addClues(across_clues, down_clues, rowLength) {
        var across = document.querySelector("#across")
        var down = document.querySelector("#down")

        // Across
        for (c in across_clues) {
            var a_clue = document.createElement('p');
            // innerText instead of textContent is supposed to handle styles such as <br> - but it's not
            a_clue.innerText = across_clues[c]; 
            a_clue.className = 'across';
            // attributes
            a_clue.setAttribute('is_complete', 'not_complete');
            a_clue.setAttribute('highlight_state', 'none');
            a_clue.setAttribute('clue_num', a_clue.textContent.substring(0, a_clue.textContent.indexOf('.')));
            // event listeners
            a_clue.addEventListener('mouseenter', clueMouseIn);
            a_clue.addEventListener('mouseleave', clueMouseLeave);
            a_clue.addEventListener('click', clickedClue);

            across.appendChild(a_clue, rowLength);

            attachClueWord(a_clue); 

            //tooltips
            let refClue = findNumRef(a_clue.textContent);
            appendTooltip(a_clue, refClue);
        }
        // Down
        for (c in down_clues) {
            var d_clue = document.createElement('p');
            // innerText instead of textContent is supposed to handle styles such as <br> - but it's not
            d_clue.innerText = down_clues[c];
            d_clue.className = 'down';
            
            // attributes
            d_clue.setAttribute('is_complete', 'not_complete');
            d_clue.setAttribute('highlight_state', 'None');
            d_clue.setAttribute('clue_num', d_clue.textContent.substring(0, d_clue.textContent.indexOf('.')));
            // event listeners
            d_clue.addEventListener('mouseenter', clueMouseIn);
            d_clue.addEventListener('mouseleave', clueMouseLeave);
            d_clue.addEventListener('click', clickedClue);

            down.appendChild(d_clue);

            attachClueWord(d_clue, rowLength); 

            //tooltips
            let refClue = findNumRef(d_clue.textContent);
            appendTooltip(d_clue, refClue);
        }
        // set tooltip text
        let tooltips = document.querySelectorAll('span');

        tooltips.forEach(tips => {
            let tipRef = tips.getAttribute('ref_clue');
            let refText = document.querySelector(`p[clue_label="${tipRef}"]`).textContent;
            tips.textContent = refText;    
        });
    }

    function attachClueWord(clue, rowLength){

        firstLetter = getWordNum(clue);

        let firstLetterPos = parseInt(firstLetter.getAttribute('input_pos'));
        let clueDir = clue.getAttribute('class');

        let wordAttr = (clueDir === 'across') ? 'across_word' : (clueDir === 'down') ? 'down_word' : none;
        let wordNum = clue.getAttribute('clue_num');
 
        // increment 1 for 'across' or rowlength for 'down'
        let increment = (clueDir === 'across') ? i = 1 : i = rowLength;
        
        // going right, change input highlight attr for all until black cell 
        for (i = increment;; i += increment){
        let letter = document.querySelector(`input[input_pos="${firstLetterPos + i}"`);
        // stop at a rightmost black square
        if(!letter) break;

        // stop at end of row
        if ((clueDir === 'across') && letter.getAttribute('input_pos') % (rowLength) == 0){
            break;
        }
        firstLetter.setAttribute(wordAttr, `${wordNum + '_' + clueDir}`);
        letter.setAttribute(wordAttr, `${wordNum + '_' + clueDir}`);
        }

        clue.setAttribute('clue_label', `${wordNum + '_' + clueDir}`);
    }

    function findNumRef(clueText){
        let textArr = clueText.split(' ');

        for (i in textArr){
            // skip 1st index check all other words for reference number
            if((i != 0) && ($.isNumeric(textArr[i]))){ 
                let refNum = textArr[i];
                // gets word after ref number
                let afterNum = (textArr[parseInt(i)+1]) ? textArr[parseInt(i)+1].toLowerCase() : null;
                
                if (!afterNum){continue;}
                else if (afterNum.includes("across") || afterNum.includes("down")){
                    let refWord = afterNum.includes("across") ? 'across' : afterNum.includes("down") ?
                    'down' : null;
                    let refClue = (refNum + '_' + refWord);

                    return refClue
                } 
            }
        }
    }

    function appendTooltip(clue, refClue){
        if (refClue) {
            var tooltip = document.createElement('span');
            clue.setAttribute('ref', 'tooltip');
            tooltip.textContent = 'dis my content';
            tooltip.className = 'tooltip';
            tooltip.setAttribute('ref_clue', refClue);
            clue.appendChild(tooltip);
        }
    }

/* #endregion - Generate webpage */
/* #region - direction */
    function changeDir(e){
        let dirState = document.querySelector('form').getAttribute('dirState');

        if (dirState === 'horizontal'){
            dirState = document.querySelector('form').setAttribute('dirState', 'vertical');
        }
        else if(dirState === 'vertical'){
            dirState = document.querySelector('form').setAttribute('dirState', 'horizontal');
        }
        blurInput(e);
        focusInput();
    }

/* #endregion - direction */
/* #region - mouse events */
    // inputs
    function focusInput(){
        let currentInput = document.activeElement;
        let dirState = document.querySelector('form').getAttribute('dirState');

        currentInput.select(); // selects value in input

        let activeInputLabel = highlightActiveWord(currentInput, dirState, 'active_word');

        let clue = document.querySelector(`p[clue_label = "${activeInputLabel}"`);
        clue.setAttribute('highlight_state', 'clicked_clue');
        clue.scrollIntoViewIfNeeded({behaviour: 'smooth', block: 'center'});
    }

    function blurInput(e){
        let activeClue = document.querySelector(`p[highlight_state = 'clicked_clue'`);
        let activeWord = document.querySelectorAll(`input[highlight = 'active_word'`);

        e.target.removeAttribute('word_dir');
        activeWord.forEach(letters => (letters.setAttribute('highlight', 'None')));

        if (activeClue) activeClue.setAttribute('highlight_state', 'None');
    }

    function highlightActiveWord(currentInput, dirState, inputAttr){
        let dirLabel = (dirState === 'horizontal') ? 'across' : (dirState === 'vertical') ? 'down' : dirState;
        let wordLabel = (dirLabel + '_word');
        let activeInputLabel = currentInput.getAttribute(wordLabel);
        let activeWord = document.querySelectorAll(`input[${wordLabel}="${activeInputLabel}"`);
        // word
        currentInput.setAttribute('word_dir', dirState);
      
        activeWord.forEach(letters => {
            if(letters.getAttribute('highlight') !== 'active_word') { // does't change focused inputs
                (letters.setAttribute('highlight', inputAttr));
            } 
        });

        return activeInputLabel;
    }

    function markComplete(e){
        let activeInput = e.target;

        // determines if input is filled and sets attribute
        if (!activeInput.value.length < activeInput.getAttribute('maxlength')) activeInput.setAttribute('is_complete', 'filled_in'); // verifies filled input
        else if (activeInput.value.length < activeInput.getAttribute('maxlength')) activeInput.setAttribute('is_complete', 'empty'); // resets empty inputs

        // gets both across and down words for strikethrough style
        let wordDir = ['across_word', 'down_word'];

        wordDir.forEach(dir => {
            if (dir === 'across_word') return strikeClue('across_word', activeInput);
            else if (dir === 'down_word') return strikeClue('down_word', activeInput);
        });
    }

    function strikeClue(wordLabel, activeInput){

        let activeInputLabel = activeInput.getAttribute(wordLabel);
        let activeNodeList = document.querySelectorAll(`input[${wordLabel}="${activeInputLabel}"`);
        let activeWord = Array.from(activeNodeList);

        let activeClue = document.querySelector(`p[clue_label="${activeInputLabel}"`);
        
        let wordIsComplete = activeWord.every(node => {return (node.getAttribute('is_complete') === 'filled_in')});

        // reset clue styles
        if (wordIsComplete) activeClue.setAttribute('is_complete', 'strike_through');
        else if (!wordIsComplete) activeClue.setAttribute('is_complete', 'not complete');
    }

    function inputMouseEnter(){

        let dirState = document.querySelector('form').getAttribute('dirState');
        let currentInput = this.firstElementChild;

        if (currentInput.getAttribute('highlight') !== 'active_word'){
            let activeInputLabel = highlightActiveWord(currentInput, dirState, 'mouse_over');
            let clue = document.querySelector(`p[clue_label = "${activeInputLabel}"`);
            clue.setAttribute('highlight_state', 'mouse_on_clue');
            clue.scrollIntoViewIfNeeded({behaviour: 'smooth', block: 'center'});
        }
    }

    function inputMouseLeave(){

        let mouseOverWords = document.querySelectorAll(`input[highlight = 'mouse_over'`);
        let mousedClue = document.querySelector(`p[highlight_state = 'mouse_on_clue'`);
        let activeClue = document.querySelector(`p[highlight_state = 'clicked_clue'`);

        // gets current highlighted inputs and resets all highlights to 'None'
        mouseOverWords.forEach(words => (words.setAttribute('highlight', 'None')));

        if (mousedClue) mousedClue.setAttribute('highlight_state', 'None');

        // scrolls back to clicked clue 
        if (activeClue) activeClue.scrollIntoViewIfNeeded({behaviour: 'smooth', block: 'center'});
    }

// clues

    // clicks on clues
    function clickedClue(){
      
        let currentInput = getWordNum(this);
        let clueIsClicked = this.getAttribute('highlight_state') === 'clickedClue';
        let clueDir = this.getAttribute('class');
        // changes form dirState on click
        if (clueDir === 'across') document.querySelector('form').setAttribute('dirState', 'horizontal');
        else if (clueDir === 'down') document.querySelector('form').setAttribute('dirState', 'vertical');
  
        if (clueIsClicked){
            this.setAttribute('highlight_state', 'None');
            currentInput.blur();
        }
        else if (!clueIsClicked){
            currentInput.select();
        }
    }

    function clueMouseIn(){

        let currentInput = getWordNum(this);
        let clueDir = this.getAttribute('class');

        if (this.getAttribute('highlight_state') !== 'clicked_clue') {
            this.setAttribute('highlight_state', 'mouse_on_clue');
            highlightActiveWord(currentInput, clueDir, 'mouse_over');
        }
    }

    function clueMouseLeave(){

        let currentInput = getWordNum(this);
        let clueDir = this.getAttribute('class');
        let highlightState = this.getAttribute('highlight_state');

        if (highlightState !== 'clicked_clue') {
            this.setAttribute('highlight_state', 'None');
            highlightActiveWord(currentInput, clueDir, 'None');
        } 
    }

    // highlight word form clue
    function getWordNum(activeClue){
            // for input highlight
            let clueLabel = activeClue.getAttribute('clue_num');
            let inputLabel = document.querySelector(`.cross_label[x_label='${parseInt(clueLabel)}'`);
            let currentInput = inputLabel.previousElementSibling;

            return currentInput;
    }
/* #endregion - mouse events */
/* #region - validation */
    function evaluateUserInput(e){
    
        let answer = e.target;
        let userAnswer = answer.value
        let crossAnswer = answer.getAttribute('name');
        
        if (userAnswer === crossAnswer) answer.setAttribute('evaluate', 'correct');
        else if (userAnswer !== crossAnswer) answer.setAttribute('evaluate', 'wrong');
    }

    function validation(){ // mouse down on button
        let allInputs = document.querySelectorAll('input');
        // blank inputs evaluate to 'wrong'
        allInputs.forEach(input => (input.value < input.getAttribute('maxlength')) && input.setAttribute ('evaluate', 'wrong'));

        // set highlights for correct and incorrect answers
        let wrongAnswers = document.querySelectorAll(`input[evaluate = 'wrong'`);
        let correctAnswers = document.querySelectorAll(`input[evaluate = 'correct'`);

        correctAnswers.forEach(letters => (letters.setAttribute('highlight', 'correct')));
        wrongAnswers.forEach(letters => (letters.setAttribute('highlight', 'wrong')));
    }

/* #endregion - validation */
/* #region - key navigation */
    function nav(e){ 
        let alphaCharArr = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
        
        if (alphaCharArr.includes(e.key))getNextInput('alphaChar'), evaluateUserInput(e); // letters
        else if (e.key === 'Tab') tabToNextWord(); // tab
        // there is no e.key for space - e.code instead
        else if (e.code === 'Space' || e.key === 'Enter') getNextInput('space'); // enter and space bar
        else if (e.key === 'Backspace') getNextInput('backspace'); // backspace (moves backward)
        else if (e.key === 'Delete') getNextInput('delete') // delete (moves forward)
        else if (e.key === 'ArrowRight') document.querySelector('form').setAttribute('dirState', 'horizontal'),getNextInput('right'); // right
        else if (e.key === 'ArrowLeft') document.querySelector('form').setAttribute('dirState', 'horizontal'),getNextInput('left', ); // left
        else if (e.key === 'ArrowUp') document.querySelector('form').setAttribute('dirState', 'vertical'),getNextInput('up'); // up
        else if (e.key === 'ArrowDown') document.querySelector('form').setAttribute('dirState', 'vertical'),getNextInput('down', 'vertical'); // down
    } 

    function tabToNextWord(){

        let dirState = document.querySelector('form').getAttribute('dirState');

        let clueDir = (dirState === 'horizontal') ? 'across' : 'down';
        let nextClue = document.querySelector(`.${clueDir}[highlight_state="clicked_clue"]`).nextElementSibling;

        nextWord = (nextClue) ? nextWord = getWordNum(nextClue) : nextWord = getWordNum(document.querySelector(`.${clueDir}[clue_num="1"]`))
        
        nextWord.select();
    }
    function getNextInput(keyValue){

        let dirState = document.querySelector('form').getAttribute('dirState');
        let currentPos = parseInt(document.activeElement.getAttribute('input_pos'));

        let totalCells = content.answer_key.length;
        let rowLength = Math.sqrt(totalCells);
        let isFirstRow =  currentPos < rowLength;
        let isBottomRow =  currentPos > totalCells - rowLength;

        let incrementValues = getIncrement(keyValue, dirState, totalCells, rowLength, currentPos, isBottomRow, isFirstRow);

        let increment = incrementValues[0];
        let keyDir = incrementValues[1];
 
        let forward = document.querySelector(`input[input_pos="${currentPos + increment}"`);
        let back = document.querySelector(`input[input_pos="${currentPos - increment}"`);
     
        let nextInput = (keyDir === 'right' || keyDir === 'down') ? forward : ((keyDir === 'up') || keyDir === 'left') ? back : null;

        while (nextInput === null){
            // alpha characters, moving vertically, tab to next word 
            if (keyValue === 'alphaChar' && keyDir === 'down') nextInput = tabToNextWord();
            
            let skipBlackCells = (nextInput) ? false : true;

            nextInput = selectNextInput(keyDir, nextInput, currentPos, increment, rowLength, totalCells, isFirstRow, isBottomRow, skipBlackCells);
            if (nextInput) nextInput.select();
            return nextInput;
        }
        if(nextInput){
            nextInput = selectNextInput(keyDir, nextInput, currentPos, increment, rowLength, totalCells,  isFirstRow, isBottomRow, false);
        } 
    }


    function getIncrement(keyValue, dirState, totalCells, rowLength, currentPos, isBottomRow, isFirstRow){
 
        let lastCell = totalCells -1
        let oppositeEndRow = (totalCells - rowLength)
        let backToFirstCell = -(lastCell)
        
        let keyDirection = () => {
            if ((keyValue === 'alphaChar' || keyValue === 'space' || keyValue === 'delete') && dirState === 'horizontal') return 'right'; // right
            else if ((keyValue === 'alphaChar' || keyValue === 'space') && dirState === 'vertical' || keyValue === 'delete') return 'down' ; // down
            else if (keyValue === 'backspace' && dirState === 'horizontal') return 'left'; // left
            else if (keyValue === 'backspace' && dirState === 'vertical') return 'up'; // up
            else return keyValue; // value passed in to function (right, left, down up)
        }

        keyDir = keyDirection();

        // current pos in last cell and moving right - moves to first cell
        if (currentPos === lastCell && keyDir === 'right') increment = backToFirstCell;
        // current pos in first cell moving left - moves to last cell
        else if (currentPos === 0 && keyDir === 'left') {keyDir = 'right'; increment = lastCell;} 
        // current pos in first row, moving up - move to last row
        else if (isFirstRow && keyDir === 'up') {keyDir = 'down'; increment = oppositeEndRow;} 
        // current pos in bottom row and *not typing letters* - moves to top of column
        else if (isBottomRow && (keyDir === 'down') && (keyValue !== 'alphaChar')) increment = -oppositeEndRow;
        // general navigation
        else if (dirState === 'across' || dirState === 'horizontal') increment = 1;
        else if (dirState === 'down' || dirState === 'vertical') increment = rowLength;

        return [increment, keyDir]
    }


    function selectNextInput(keyDir, nextInput, currentPos, increment, rowLength, totalCells,  isFirstRow, isBottomRow, skipBlackCells){

        let increase = increment;
        
        while (nextInput === null && skipBlackCells){
            let nextCellPos = (keyDir === 'up') ? (currentPos - increase) : (keyDir === 'down') ?  (currentPos + increase) : null;

            let blackCellsAtTop = (!isFirstRow && nextCellPos < 0);
            let blackCellsAtBottom = (!isBottomRow && nextCellPos > (totalCells - 1));

            let blackCellsOppositeTopRow = (isBottomRow && increment < 0 && nextInput === null);
            let blackCellsOppositeBottomRow = (isFirstRow && increment === (totalCells - rowLength) && nextInput === null);
       
            if (!blackCellsOppositeTopRow && !blackCellsOppositeBottomRow) increase += increment;  

            // add increment if ('right', 'down', 'space') else subtract increment  
            let newPos = (keyDir === 'right' || keyDir === 'down') ? currentPos + increase : currentPos - increase;

            //accounts for black cells leading to top or bottom row
            if (blackCellsAtBottom || blackCellsAtTop) { 
                let row = Math.floor(currentPos / rowLength); // get row # (starts from 0)

                increase = (!isBottomRow && nextCellPos > (totalCells - 1)) ? (row * rowLength) : (!isFirstRow && nextCellPos < 0) ? (totalCells - ((row + 1) * rowLength)) : null; 

                newPos = (!isBottomRow && nextCellPos > (totalCells - 1)) ? (currentPos - increase) : (!isFirstRow && nextCellPos < 0) ? (currentPos + increase) : null;
            }
 
            // accounts for black cells in end row when moving vertically from the other end
            else if (blackCellsOppositeTopRow || blackCellsOppositeBottomRow){ 
                while (nextInput === null){ 
                    increment = rowLength;
                    if (blackCellsOppositeTopRow) increase += increment;
                    else if (blackCellsOppositeBottomRow) increase -= increment;
                    nextInput = document.querySelector(`input[input_pos="${currentPos + increase}"`);
                    if (nextInput) return nextInput;  
                }   
            }

            nextInput = document.querySelector(`input[input_pos="${newPos}"`);
            if (nextInput) return nextInput;
        }
        // select next input if current input is not in first row and not going up
        if (nextInput) nextInput.select();
    }
/* #endregion - key navigation */

})();
