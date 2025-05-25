document.addEventListener('DOMContentLoaded', () => {
    // --- กำหนดข้อมูลสำหรับแต่ละกลุ่มลูกค้า/Item ---
    const customerGroups = [
        {
            id: 'barrel',
            item: 'Barrel',
            models: ['AH14', 'AH15', 'AH16N', 'AH16A', 'AH16C', 'AH31', 'AH35', 'AH44'],
            ppmTarget: 10000,
            containerId: 'barrel-models',
            overallResultsId: 'overallBarrelResults'
        },
        {
            id: 'lower',
            item: 'Lower',
            models: ['AH25', 'AH26', 'AH43'],
            ppmTarget: 5000,
            containerId: 'lower-models',
            overallResultsId: 'overallLowerResults'
        }
    ];

    const calculateBtn = document.getElementById('calculateBtn');
    const resultsOutput = document.getElementById('resultsOutput');

    // --- ฟังก์ชันสำหรับสร้างช่องกรอกข้อมูล ---
    function createInputFields(group) {
        const container = document.querySelector(`.${group.containerId}`);
        group.models.forEach(model => {
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('barrel-model-entry'); // ใช้ class เดิมเพื่อคงสไตล์
            entryDiv.innerHTML = `
                <label for="${group.id}-${model}-claim"> ${model}</label>
                <input type="number" id="${group.id}-${model}-claim" placeholder="ยอดเคลม" min="0">
                <input type="number" id="${group.id}-${model}-sale" placeholder="ยอดขาย" min="0">
            `;
            container.appendChild(entryDiv);
        });
    }

    // สร้างช่องกรอกข้อมูลสำหรับทุกกลุ่ม
    customerGroups.forEach(group => createInputFields(group));

    // --- ฟังก์ชันสำหรับคำนวณและแสดงผล ---
    function processCustomerGroup(group) {
        let totalClaim = 0;
        let totalSale = 0;
        let hasValidInputInGroup = false; // ตรวจสอบว่ามีข้อมูลที่ถูกต้องในกลุ่มนี้หรือไม่
        let hasErrorInGroup = false; // ตรวจสอบว่ามีข้อผิดพลาดในการกรอกข้อมูลในกลุ่มนี้หรือไม่

        group.models.forEach(model => {
            const claimInput = document.getElementById(`${group.id}-${model}-claim`);
            const saleInput = document.getElementById(`${group.id}-${model}-sale`);

            const claimValue = claimInput.value.trim();
            const saleValue = saleInput.value.trim();

            let claim = 0;
            let sale = 0;
            let isValidForThisModel = true;

            // ตรวจสอบข้อมูลเคลม
            if (claimValue !== '') {
                claim = parseFloat(claimValue);
                if (isNaN(claim) || claim < 0) {
                    isValidForThisModel = false;
                }
            }
            // ตรวจสอบข้อมูลขาย
            if (saleValue !== '') {
                sale = parseFloat(saleValue);
                if (isNaN(sale) || sale < 0) {
                    isValidForThisModel = false;
                }
            }

            // ไฮไลต์ช่องที่มีข้อผิดพลาด (ไม่ใช่แค่ว่างเปล่า)
            if (!isValidForThisModel) {
                claimInput.style.borderColor = (isNaN(parseFloat(claimValue)) && claimValue !== '') || parseFloat(claimValue) < 0 ? 'red' : '#ccc';
                saleInput.style.borderColor = (isNaN(parseFloat(saleValue)) && saleValue !== '') || parseFloat(saleValue) < 0 ? 'red' : '#ccc';
                hasErrorInGroup = true;
                return; // ข้ามการคำนวณ PPM และการแสดงผลสำหรับรุ่นนี้หากมีข้อผิดพลาด
            } else {
                claimInput.style.borderColor = '#ccc'; // คืนค่าสีปกติ
                saleInput.style.borderColor = '#ccc'; // คืนค่าสีปกติ
            }

            // ถ้ารุ่นนี้มีข้อมูลที่ถูกต้อง (แม้จะเป็น 0) ให้นำไปรวมยอดรวมและแสดงผลรายรุ่น
            if (claimValue !== '' || saleValue !== '') {
                totalClaim += claim;
                totalSale += sale;
                hasValidInputInGroup = true;
            }

            let ppm = 0;
            if (sale > 0) {
                ppm = (claim * 1000000) / sale;
            } else if (claim > 0 && sale === 0) {
                ppm = Infinity;
            }

            // แสดงผลลัพธ์รายรุ่นเฉพาะรุ่นที่มีข้อมูลกรอก
            if (claimValue !== '' || saleValue !== '') {
                const resultDiv = document.createElement('div');
                resultDiv.classList.add('result-item');

                const ppmValueSpan = document.createElement('span');
                ppmValueSpan.classList.add('ppm-value');

                if (ppm === Infinity || ppm > group.ppmTarget) {
                    ppmValueSpan.classList.add('ppm-red');
                } else {
                    ppmValueSpan.classList.add('ppm-blue');
                }

                resultDiv.innerHTML = `
                    <span class="result-label">  ${group.item} รุ่น ${model} PPM:</span>
                `;
                ppmValueSpan.textContent = isFinite(ppm) ? ppm.toFixed(2) : 'สูงมาก';

                resultDiv.appendChild(ppmValueSpan);
                resultsOutput.appendChild(resultDiv);
            }
        });

        // แสดงผลลัพธ์รวมสำหรับกลุ่มนี้
        const overallResultsContainer = document.getElementById(group.overallResultsId);
        overallResultsContainer.innerHTML = ''; // ล้างผลลัพธ์รวมเก่าของกลุ่มนี้

        if (hasValidInputInGroup && !hasErrorInGroup) { // แสดงผลรวมเฉพาะเมื่อมีข้อมูลและไม่มีข้อผิดพลาด
            let overallPPM = 0;
            if (totalSale > 0) {
                overallPPM = (totalClaim * 1000000) / totalSale;
            } else if (totalClaim > 0 && totalSale === 0) {
                overallPPM = Infinity;
            }

            const overallClaimDiv = document.createElement('div');
            overallClaimDiv.classList.add('result-item');
            overallClaimDiv.innerHTML = `<span class="result-label">ยอดเคลมรวม:</span> <span>${totalClaim.toLocaleString()}</span>`;
            overallResultsContainer.appendChild(overallClaimDiv);

            const overallSaleDiv = document.createElement('div');
            overallSaleDiv.classList.add('result-item');
            overallSaleDiv.innerHTML = `<span class="result-label">ยอดขายรวม:</span> <span>${totalSale.toLocaleString()}</span>`;
            overallResultsContainer.appendChild(overallSaleDiv);

            const overallPPMDiv = document.createElement('div');
            overallPPMDiv.classList.add('result-item');
            const overallPPMValueSpan = document.createElement('span');
            overallPPMValueSpan.classList.add('ppm-value');
            if (overallPPM === Infinity || overallPPM > group.ppmTarget) {
                overallPPMValueSpan.classList.add('ppm-red');
            } else {
                overallPPMValueSpan.classList.add('ppm-blue');
            }
            overallPPMValueSpan.textContent = isFinite(overallPPM) ? overallPPM.toFixed(2) : 'สูงมาก';
            overallPPMDiv.innerHTML = `<span class="result-label">PPM รวม TH ${group.item}:</span>`;
            overallPPMDiv.appendChild(overallPPMValueSpan);
            overallResultsContainer.appendChild(overallPPMDiv);
        } else if (!hasValidInputInGroup && !hasErrorInGroup) {
             const noDataMessage = document.createElement('p');
            noDataMessage.style.color = '#555';
            noDataMessage.style.textAlign = 'center';
            noDataMessage.textContent = `กรุณากรอกข้อมูลยอดเคลมหรือยอดขายสำหรับ TH ${group.item} อย่างน้อยหนึ่งรุ่นเพื่อคำนวณ.`;
            overallResultsContainer.appendChild(noDataMessage);
        }
    }

    // --- Event Listener สำหรับปุ่มคำนวณ ---
    calculateBtn.addEventListener('click', () => {
        resultsOutput.innerHTML = ''; // ล้างผลลัพธ์รายรุ่นทั้งหมด

        let hasOverallValidInput = false; // ตรวจสอบว่ามีข้อมูลที่ถูกต้องจากกลุ่มใดๆ เลยหรือไม่

        customerGroups.forEach(group => {
            // เรียกใช้ฟังก์ชันประมวลผลสำหรับแต่ละกลุ่มลูกค้า
            processCustomerGroup(group);

            // ตรวจสอบว่ามีข้อมูลที่ถูกต้องในกลุ่มนี้หรือไม่
            const overallResultsContainer = document.getElementById(group.overallResultsId);
            if (overallResultsContainer.children.length > 0 && !overallResultsContainer.querySelector('.ppm-red') && !overallResultsContainer.querySelector('.ppm-blue') ) {
                // ถ้ามีผลลัพธ์แสดงและไม่ใช่แค่ข้อความเตือน
                hasOverallValidInput = true;
            }
        });

        // แสดงข้อความเตือนเมื่อไม่มีข้อมูลเลยในทุกกลุ่ม
        if (!hasOverallValidInput && resultsOutput.children.length === 0) {
            const noDataMessage = document.createElement('p');
            noDataMessage.style.color = '#555';
            noDataMessage.style.textAlign = 'center';
            noDataMessage.textContent = 'กรุณากรอกข้อมูลยอดเคลมหรือยอดขายอย่างน้อยหนึ่งรุ่นในกลุ่มใดๆ เพื่อคำนวณ.';
            resultsOutput.appendChild(noDataMessage);
        }
    });
});