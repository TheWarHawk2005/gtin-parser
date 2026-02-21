const GS = String.fromCharCode(29);

const testString = "010030093542088217251131101477942112412013622091"
// parseInput(testString)

console.log('%cBuilt off a modified version of gs1GTIN.js by Kuldeep Saxena (Pinch of Logic', 'color: #999')
console.log('%chttps://github.com/PinchofLogic/JavaScript-pharmaDatamatrix/blob/main/gs1GTIN.js', 'color: #999')
console.log('%cApp programmed by Louis Harrison... consider giving dad a raise?', 'color: #974d4e')

const dataInput = document.getElementById('data-input')
const log = document.getElementById('log')

dataInput.focus()

document.querySelectorAll('.output-div').forEach(div => {
    div.addEventListener('click', event => {
        const element = event.currentTarget
        element.style.backgroundColor = '#abff94'
        selectElementContents(element)
        navigator.clipboard.writeText(element.outerText)
    })

    div.addEventListener('mouseleave', event => {
        event.currentTarget.style.backgroundColor = ''
    })
})
dataInput.addEventListener('click', event => {
    if (event.target.value) event.target.select()
})
dataInput.addEventListener('change', event => {
    parseInput(dataInput.value)
})


function parseInput(inputData) {
    if (inputData) {
        const PARSED = GTIN(inputData)

        if (PARSED.gtin) writeOutput(PARSED.gtin, 'GTIN-output', { format: 'chunk' })
        if (PARSED.expiration_date) writeOutput(PARSED.expiration_date, 'EXP-output', { format: 'date' })
        if (PARSED.production_date) writeOutput(PARSED.production_date, 'PROD-output', { format: 'date' })
        if (PARSED.lot_number) writeOutput(PARSED.lot_number, 'LOT-output')
        if (PARSED.serial_number) writeOutput(PARSED.serial_number, 'SERIAL-output', { format: 'chunk' })
        
        log.innerHTML = PARSED.ERROR
    }
}

function selectElementContents(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}


function writeOutput(string, elementID, formatRules) {
    const container = document.getElementById(elementID)
    const element = document.createElement('DIV')
    element.classList.add('data-output')

    if (formatRules && formatRules.format) {
        if (formatRules.format == 'chunk') {
            var chunk = ''
            for (i = 1; i < string.length; i++) {
                chunk = chunk + string[i]
                if (i % 4 === 0) {
                    const chunkEle = document.createElement('SPAN')
                    chunkEle.classList.add('string-chunk')
                    chunkEle.innerHTML = chunk
                    element.appendChild(chunkEle)
                    chunk = ''
                }
            }
        }
        if (formatRules.format == 'date') {
            const dateString = string.replace(/..(?=..)/g, "$&/")
            element.innerHTML = dateString
        }
    } else {
        element.innerHTML = string
    }
    container.replaceChildren(element)
}

function GTIN(barcode, result = { SCHEME: 'GTIN', ERROR: 'All systems go.'}) {
    if (!barcode || barcode.length === 0) return result;
    const ai2 = barcode.slice(0, 2);
    const ai3 = barcode.slice(0, 3);

    if (ai2 === "01") {// GTIN (14) 
        result.gtin = barcode.slice(2, 16);
        return GTIN(barcode.slice(16), result);

    } if (ai2 === "17") { // Expiry (YYMMDD) 
        result.expiration_date = barcode.slice(2, 8); return GTIN(barcode.slice(8), result);

    } if (ai2 === "11") { // Production date 
        result.production_date = barcode.slice(2, 8);
        return GTIN(barcode.slice(8), result);

    } 

    // ---- VARIABLE LENGTH (GS TERMINATED) ---- 
    if (ai2 === "10") { // Batch/Lot 
        const end = barcode.indexOf(GS); 
        result.lot_number = end !== -1 ? barcode.slice(2, end) : barcode.slice(2);
        return GTIN(end !== -1 ? barcode.slice(end + 1) : "", result);

    } if (ai2 === "21") { // Serial 
        const end = barcode.indexOf(GS);
        result.serial_number = end !== -1 ?
            barcode.slice(2, end) :
            barcode.slice(2);
        return GTIN(end !== -1 ?
            barcode.slice(end + 1) :
            "", result);
    } if (["710", "711", "712", "713", "714"].includes(ai3)) {
        const end = barcode.indexOf(GS);
        result.NHRN = end !== -1 ?
            barcode.slice(3, end) :
            barcode.slice(3);
        return GTIN(end !== -1 ?
            barcode.slice(end + 1) :
            "", result);
    }

    // ---- UNKNOWN AI → STOP (prevents infinite loop) ---- 
    result.ERROR = "Unknown AI at: " + barcode.slice(0, 4);
    return result;
}