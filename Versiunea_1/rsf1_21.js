(function ($) {
    var completedTables = {
        'processed': false,
        'tables': {}
    };

    var _isEntityMediumLarge = false;

    Drupal.behaviors.rsf1 = {
        attach: function (context, settings) {
            jQuery('#mywebform-edit-form').on('keypress', 'input.numeric, input.float, input.money', function (event) {
                var allowNegative = jQuery(this).attr('allow-negative') || false;
                if (isNumberPressed(this, event, allowNegative) === false) {
                    event.preventDefault();
                }
            });

            jQuery('#mywebform-edit-form', context).on('paste', 'input.numeric, input.money, input.float', function (event) {
                var obj = event.originalEvent || event;

                if (typeof obj.clipboardData !== 'undefined') {
                    var value = obj.clipboardData.getData('text/plain');
                    var number = Number(value);
                    var isNotNumber = isNaN(number);

                    if (jQuery(this).hasClass('allow-negative')) {
                        if (isNotNumber) {
                            event.preventDefault();
                        }
                    } else {
                        if (isNotNumber || is_negative(number)) {
                            event.preventDefault();
                        }
                    }
                }
            });

            if (!Drupal.settings.mywebform.preview) {
                var periodInfo = Drupal.settings.mywebform.period;
                $("#dec_period_from").datepicker("option", "minDate", new Date(periodInfo.start.year, periodInfo.start.month - 1, periodInfo.start.day));
                $("#dec_period_from").datepicker("option", "maxDate", new Date(periodInfo.end.year, periodInfo.end.month - 1, periodInfo.end.day));

                $("#dec_period_to").datepicker("option", "minDate", new Date(periodInfo.start.year, periodInfo.start.month - 1, periodInfo.start.day));
                $("#dec_period_to").datepicker("option", "maxDate", new Date(periodInfo.end.year, periodInfo.end.month - 1, periodInfo.end.day));

                delete_unnecessary_cfp_options();
            }

            $("#dec_period_to").on("change", function () {
                var val = $(this).val();
                var year = "";

                if (val) {
                    var periodArr = val.split(".");
                    if (periodArr.length === 3) {
                        year = periodArr[2];
                    }
                }

                $("#nalogPeriodYear").val(year).trigger("change");
            });
        }
    };

    webform.beforeLoad.rsf1 = function () {
        $('#dinamicAttachments').on('mywebform:showFileInfo', '.mywebform-file-widget', function () {
            $(this).parents('div.row').find('.delrow').show();
        });

        $('#dinamicAttachments').on('mywebform:sync', '.mywebform-file-widget', function () {
            var length = Drupal.settings.mywebform.values.dec_dinamicAttachments_row_file.length;
            if (Drupal.settings.mywebform.values.dec_dinamicAttachments_row_file[length - 1] != '') {
                $('#dinamicAttachments .grid-addrow').trigger('click');
            }
        });
    };

    webform.afterLoad.rsf1 = function () {
        if (Drupal.settings.mywebform.preview) {
            if (!Drupal.settings.mywebform.values.dec_lichidare) {
                $(".lichidare").hide();
            }
        }
    };

    webform.validators.validate_rsf1_1 = function () {
        var values = Drupal.settings.mywebform.values;

        detectMediumLargeEntity();
        identifyCompletedTables(true);

        var orgs = [890, 899, 900, 930, 700, 871, 940, 970, 910, 960, 997];
        if (orgs.indexOf(toFloat(values.dec_fiscCod_cfoj)) !== -1) {
            webform.errors.push({
                'fieldName': 'dec_fiscCod_cfoj',
                'index': 0,
                'weight': 1,
                'msg': concatMessage('57-001', '', Drupal.t('Dacă forma organizatorico-juridică este 890, 899, 900, 930, 700, 871, 940, 970, 910, 960, 997 - entitatea prezintă situaţii financiare ale organizaţiilor necomerciale')),
            });
        }

        var currentDate = new Date();
        var lastYear = new Date().getFullYear() - 1;
        var endPeriod = values.dec_period_to.split(".");
        var startPeriod = values.dec_period_from.split(".");

        if (Drupal.settings.declarations.declarations_submission_deadline_rsf1_21) {
            var erObj002 = {
                'index': 0,
                'fieldName': '',
                'weight': 2,
                'msg': concatMessage('57-002', '', Drupal.t('Termenul prezentarii Situațiilor financiare a expirat')),
            };

            var excludeIdno = ['1016600004811', '1002600008706', '1007607008364'];
            var plusDays = isLeap(currentDate.getFullYear()) ? 121 : 120;
            if (excludeIdno.indexOf(values.dec_fiscCod_fiscal) !== -1) {
                plusDays = isLeap(currentDate.getFullYear()) ? 212 : 211;
            }

            var validDate = new Date(lastYear, 11, 31 + plusDays, 23, 59, 59); // lastYear/12/31 + (120 || 121) || (211 || 212) days
            if (currentDate > validDate) {
                webform.errors.push(erObj002);
            }
        }

        var fileCnt = 0;
        var files = Drupal.settings.mywebform.values.dec_dinamicAttachments_row_file;
        for (var i = 0; i < files.length; i++) {
            if (files[i]) {
                fileCnt++;
            }
        }

        if (!fileCnt || (isEntityMediumLarge() && fileCnt < 3)) {
            webform.errors.push({
                'fieldName': '',
                'index': 0,
                'weight': 3,
                'msg': concatMessage('57-003', '', Drupal.t('Lipsește Nota explicativă sau Raportul de audit sau Raportul conducerii')),
            });
        }

        if (parseInt(startPeriod[2]) < lastYear) {
            webform.errors.push({
                'fieldName': 'dec_period_from',
                'index': 0,
                'weight': 5,
                'msg': concatMessage('57-005', '', Drupal.t('Data începutului perioadei de raportare nu este corectă')),
            });
        } else if (endPeriod.length == 3 && startPeriod.length == 3) {
            var periodToStr = endPeriod[2] + '-' + endPeriod[1] + '-' + endPeriod[0];
            var periodFromStr = startPeriod[2] + '-' + startPeriod[1] + '-' + startPeriod[0];

            if (periodFromStr > periodToStr) {
                webform.errors.push({
                    'fieldName': 'dec_period_from',
                    'index': 0,
                    'weight': 4,
                    'msg': concatMessage('57-005', '', Drupal.t('Data începutului perioadei de raportare nu este corectă')),
                });
            }
        }

        if (values.dec_lichidare && values.dec_table1_row_r880c5 > 0) {
            webform.errors.push({
                'fieldName': 'dec_table1_row_r880c5',
                'index': 0,
                'weight': 6,
                'msg': concatMessage('57-006', '', Drupal.t('Situatia financiară nu corespunde bilanțului de lichidare')),
            });
        }

        if (startPeriod.length == 3 && endPeriod.length == 3) {
            var fromDate = new Date(startPeriod[2], startPeriod[1] - 1, startPeriod[0]);
            var toDate = new Date(endPeriod[2], endPeriod[1] - 1, endPeriod[0]);

            var diffDays = Math.ceil(Math.abs(toDate.getTime() - fromDate.getTime()) / (86400000));
            var currentYear = new Date().getFullYear();
            if ((isLeap(currentYear) && diffDays > 366) || (!isLeap(currentYear) && diffDays > 365)) {
                webform.errors.push({
                    'fieldName': 'dec_period_to',
                    'index': 0,
                    'weight': 7,
                    'msg': concatMessage('57-007', '', Drupal.t('Perioada de raportare este mai mare de un an')),
                });
            }
        }

        if ((!parseInt(values.dec_fiscCod_nrEmployees) && !values.dec_fiscCod_employeesAbs) || (parseInt(values.dec_fiscCod_nrEmployees) && values.dec_fiscCod_employeesAbs)) {
            webform.errors.push({
                'fieldName': 'dec_fiscCod_nrEmployees',
                'index': 0,
                'weight': 8,
                'msg': concatMessage('57-008', '', Drupal.t('Completați Numărul mediu al salariaţilor în perioada de gestiune sau confirmați lipsa salariaților')),
            });
        }

        if (!isTableCompleted('table1') && !isTableCompleted('table2') && !isTableCompleted('table3') && !isTableCompleted('table4')) {
            webform.errors.push({
                'fieldName': '',
                'index': 0,
                'weight': 9,
                'msg': concatMessage('57-009', '', Drupal.t('Raportul nu este completat')),
            });
        }

        if (endPeriod.length == 3) {
            var periodToStr = endPeriod[2] + '-' + endPeriod[1] + '-' + endPeriod[0];
            var comparedDateStr = lastYear + '-12-31';
            if ((values.dec_lichidare && periodToStr >= comparedDateStr) || (!values.dec_lichidare && periodToStr != comparedDateStr)) {
                webform.warnings.push({
                    'fieldName': 'dec_period_to',
                    'index': 0,
                    'weight': 5,
                    'msg': concatMessage('57-010', '', Drupal.t('Data sfârșitului perioadei de raportare nu este corectă')),
                });
            }
        }

        if (!values.dec_pers_respons) {
            webform.warnings.push({
                'fieldName': 'dec_pers_respons',
                'index': 0,
                'weight': 11,
                'msg': concatMessage('57-011', '', Drupal.t('Completați Persoanele responsabile de semnarea situațiilor financiare')),
            });
        }

        var autofield_exp = [
            // table 1
            { 'rezField': 'dec_table1_row_r050c4', 'callback': _mywebform_expression_dec_table1_row_r050c4, 'err': '011', 'text': function () { return Drupal.t('Anexa 1 Rd.050 col.@col = Rd 010 + Rd 020 + Rd 030 + Rd 040 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r050c5', 'callback': _mywebform_expression_dec_table1_row_r050c5, 'err': '011', 'text': function () { return Drupal.t('Anexa 1 Rd.050 col.@col = Rd 010 + Rd 020 + Rd 030 + Rd 040 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r020c4', 'callback': _mywebform_expression_dec_table1_row_r020c4, 'err': '012', 'text': function () { return Drupal.t('Anexa 1 Rd.020 col.@col = Rd 021 + Rd 022 + Rd 023 + Rd 024 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r020c5', 'callback': _mywebform_expression_dec_table1_row_r020c5, 'err': '012', 'text': function () { return Drupal.t('Anexa 1 Rd.020 col.@col = Rd 021 + Rd 022 + Rd 023 + Rd 024 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r130c4', 'callback': _mywebform_expression_dec_table1_row_r130c4, 'err': '013', 'text': function () { return Drupal.t('Anexa 1 Rd.130 col.@col = Rd 060 + Rd 070 + Rd 080 + Rd 090 + Rd 100 + Rd 110 + Rd 120 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r130c5', 'callback': _mywebform_expression_dec_table1_row_r130c5, 'err': '013', 'text': function () { return Drupal.t('Anexa 1 Rd.130 col.@col = Rd 060 + Rd 070 + Rd 080 + Rd 090 + Rd 100 + Rd 110 + Rd 120 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r080c4', 'callback': _mywebform_expression_dec_table1_row_r080c4, 'err': '014', 'text': function () { return Drupal.t('Anexa 1 Rd.080 col.@col = Rd 081 + Rd 082 + Rd 083 + Rd 084 + Rd 085 + Rd 086 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r080c5', 'callback': _mywebform_expression_dec_table1_row_r080c5, 'err': '014', 'text': function () { return Drupal.t('Anexa 1 Rd.080 col.@col = Rd 081 + Rd 082 + Rd 083 + Rd 084 + Rd 085 + Rd 086 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r160c4', 'callback': _mywebform_expression_dec_table1_row_r160c4, 'err': '015', 'text': function () { return Drupal.t('Anexa 1 Rd.160 col.@col = Rd 140 + Rd 150 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r160c5', 'callback': _mywebform_expression_dec_table1_row_r160c5, 'err': '015', 'text': function () { return Drupal.t('Anexa 1 Rd.160 col.@col = Rd 140 + Rd 150 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r150c4', 'callback': _mywebform_expression_dec_table1_row_r150c4, 'err': '016', 'text': function () { return Drupal.t('Anexa 1 Rd.150 col.@col = Rd 151 + Rd 152 + Rd 153 + Rd 154 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r150c5', 'callback': _mywebform_expression_dec_table1_row_r150c5, 'err': '016', 'text': function () { return Drupal.t('Anexa 1 Rd.150 col.@col = Rd 151 + Rd 152 + Rd 153 + Rd 154 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r220c4', 'callback': _mywebform_expression_dec_table1_row_r220c4, 'err': '017', 'text': function () { return Drupal.t('Anexa 1 Rd.220 col.@col = Rd 170 + Rd 180 + Rd 190 + Rd 200 + Rd 210 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r220c5', 'callback': _mywebform_expression_dec_table1_row_r220c5, 'err': '017', 'text': function () { return Drupal.t('Anexa 1 Rd.220 col.@col = Rd 170 + Rd 180 + Rd 190 + Rd 200 + Rd 210 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r230c4', 'callback': _mywebform_expression_dec_table1_row_r230c4, 'err': '018', 'text': function () { return Drupal.t('Anexa 1 Rd.230 col.@col = Rd 050 + Rd 130 + Rd 160 + Rd 220 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r230c5', 'callback': _mywebform_expression_dec_table1_row_r230c5, 'err': '018', 'text': function () { return Drupal.t('Anexa 1 Rd.230 col.@col = Rd 050 + Rd 130 + Rd 160 + Rd 220 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r290c4', 'callback': _mywebform_expression_dec_table1_row_r290c4, 'err': '019', 'text': function () { return Drupal.t('Anexa 1 Rd.290 col.@col = Rd 240 + Rd 250 + Rd 260 + Rd 270 + Rd 280 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r290c5', 'callback': _mywebform_expression_dec_table1_row_r290c5, 'err': '019', 'text': function () { return Drupal.t('Anexa 1 Rd.290 col.@col = Rd 240 + Rd 250 + Rd 260 + Rd 270 + Rd 280 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r370c4', 'callback': _mywebform_expression_dec_table1_row_r370c4, 'err': '021', 'text': function () { return Drupal.t('Anexa 1 Rd.370 col.@col = Rd 300 + Rd 310 + Rd 320 + Rd 330 + Rd 340 + Rd 350 + Rd 360 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r370c5', 'callback': _mywebform_expression_dec_table1_row_r370c5, 'err': '021', 'text': function () { return Drupal.t('Anexa 1 Rd.370 col.@col = Rd 300 + Rd 310 + Rd 320 + Rd 330 + Rd 340 + Rd 350 + Rd 360 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r400c4', 'callback': _mywebform_expression_dec_table1_row_r400c4, 'err': '022', 'text': function () { return Drupal.t('Anexa 1 Rd.400 col.@col = Rd 380 + Rd 390 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r400c5', 'callback': _mywebform_expression_dec_table1_row_r400c5, 'err': '022', 'text': function () { return Drupal.t('Anexa 1 Rd.400 col.@col = Rd 380 + Rd 390 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r390c4', 'callback': _mywebform_expression_dec_table1_row_r390c4, 'err': '023', 'text': function () { return Drupal.t('Anexa 1 Rd.390 col.@col = Rd 391 + Rd 392 + Rd 393 + Rd 394 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r390c5', 'callback': _mywebform_expression_dec_table1_row_r390c5, 'err': '023', 'text': function () { return Drupal.t('Anexa 1 Rd.390 col.@col = Rd 391 + Rd 392 + Rd 393 + Rd 394 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r420c4', 'callback': _mywebform_expression_dec_table1_row_r420c4, 'err': '024', 'text': function () { return Drupal.t('Anexa 1 Rd.420 col.@col = Rd 290 + Rd 370 + Rd 400 + Rd 410 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r420c5', 'callback': _mywebform_expression_dec_table1_row_r420c5, 'err': '024', 'text': function () { return Drupal.t('Anexa 1 Rd.420 col.@col = Rd 290 + Rd 370 + Rd 400 + Rd 410 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r430c4', 'callback': _mywebform_expression_dec_table1_row_r430c4, 'err': '025', 'text': function () { return Drupal.t('Anexa 1 Rd.430 col.@col = Rd 230 + Rd 420 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r430c5', 'callback': _mywebform_expression_dec_table1_row_r430c5, 'err': '025', 'text': function () { return Drupal.t('Anexa 1 Rd.430 col.@col = Rd 230 + Rd 420 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r490c4', 'callback': _mywebform_expression_dec_table1_row_r490c4, 'err': '026', 'text': function () { return Drupal.t('Anexa 1 Rd.490 col.@col = Rd 440 + Rd 450 + Rd 460 + Rd 470 + Rd 480 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r490c5', 'callback': _mywebform_expression_dec_table1_row_r490c5, 'err': '026', 'text': function () { return Drupal.t('Anexa 1 Rd.490 col.@col = Rd 440 + Rd 450 + Rd 460 + Rd 470 + Rd 480 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r540c4', 'callback': _mywebform_expression_dec_table1_row_r540c4, 'err': '027', 'text': function () { return Drupal.t('Anexa 1 Rd.540 col.@col = Rd 510 + Rd 520 + Rd 530 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r540c5', 'callback': _mywebform_expression_dec_table1_row_r540c5, 'err': '027', 'text': function () { return Drupal.t('Anexa 1 Rd.540 col.@col = Rd 510 + Rd 520 + Rd 530 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r590c4', 'callback': _mywebform_expression_dec_table1_row_r590c4, 'err': '028', 'text': function () { return Drupal.t('Anexa 1 Rd.590 col.@col = Rd 550 + Rd 560 + Rd 570 + Rd 580 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r590c5', 'callback': _mywebform_expression_dec_table1_row_r590c5, 'err': '028', 'text': function () { return Drupal.t('Anexa 1 Rd.590 col.@col = Rd 550 + Rd 560 + Rd 570 + Rd 580 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r620c4', 'callback': _mywebform_expression_dec_table1_row_r620c4, 'err': '029', 'text': function () { return Drupal.t('Anexa 1 Rd.620 col.@col = Rd 490 + Rd 500 + Rd 540 + Rd 590 + Rd 600 + Rd 610 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r620c5', 'callback': _mywebform_expression_dec_table1_row_r620c5, 'err': '029', 'text': function () { return Drupal.t('Anexa 1 Rd.620 col.@col = Rd 490 + Rd 500 + Rd 540 + Rd 590 + Rd 600 + Rd 610 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r700c4', 'callback': _mywebform_expression_dec_table1_row_r700c4, 'err': '030', 'text': function () { return Drupal.t('Anexa 1 Rd.700 col.@col = Rd 630 + Rd 640 + Rd 650 + Rd 660 + Rd 670 + Rd 680 + Rd 690 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r700c5', 'callback': _mywebform_expression_dec_table1_row_r700c5, 'err': '030', 'text': function () { return Drupal.t('Anexa 1 Rd.700 col.@col = Rd 630 + Rd 640 + Rd 650 + Rd 660 + Rd 670 + Rd 680 + Rd 690 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r640c4', 'callback': _mywebform_expression_dec_table1_row_r640c4, 'err': '031', 'text': function () { return Drupal.t('Anexa 1 Rd.640 col.@col = Rd 641 + Rd 643 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r640c5', 'callback': _mywebform_expression_dec_table1_row_r640c5, 'err': '031', 'text': function () { return Drupal.t('Anexa 1 Rd.640 col.@col = Rd 641 + Rd 643 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r820c4', 'callback': _mywebform_expression_dec_table1_row_r820c4, 'err': '034', 'text': function () { return Drupal.t('Anexa 1 Rd.820 col.@col = Rd 710 + Rd 720 + Rd 730 + Rd 740 + Rd 750 + Rd 760 + Rd 770 + Rd 780 + Rd 790 + Rd 800 + Rd 810 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r820c5', 'callback': _mywebform_expression_dec_table1_row_r820c5, 'err': '034', 'text': function () { return Drupal.t('Anexa 1 Rd.820 col.@col = Rd 710 + Rd 720 + Rd 730 + Rd 740 + Rd 750 + Rd 760 + Rd 770 + Rd 780 + Rd 790 + Rd 800 + Rd 810 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r720c4', 'callback': _mywebform_expression_dec_table1_row_r720c4, 'err': '035', 'text': function () { return Drupal.t('Anexa 1 Rd.720 col.@col = Rd 721 + Rd 723 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r720c5', 'callback': _mywebform_expression_dec_table1_row_r720c5, 'err': '035', 'text': function () { return Drupal.t('Anexa 1 Rd.720 col.@col = Rd 721 + Rd 723 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r870c4', 'callback': _mywebform_expression_dec_table1_row_r870c4, 'err': '038', 'text': function () { return Drupal.t('Anexa 1 Rd.870 col.@col = Rd 830 + Rd 840 + Rd 850 + Rd 860 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r870c5', 'callback': _mywebform_expression_dec_table1_row_r870c5, 'err': '038', 'text': function () { return Drupal.t('Anexa 1 Rd.870 col.@col = Rd 830 + Rd 840 + Rd 850 + Rd 860 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table1_row_r880c4', 'callback': _mywebform_expression_dec_table1_row_r880c4, 'err': '039', 'text': function () { return Drupal.t('Anexa 1 Rd.880 col.@col = Rd 620 + Rd 700 + Rd 820 + Rd 870 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table1_row_r880c5', 'callback': _mywebform_expression_dec_table1_row_r880c5, 'err': '039', 'text': function () { return Drupal.t('Anexa 1 Rd.880 col.@col = Rd 620 + Rd 700 + Rd 820 + Rd 870 col.@col', { '@col': 5 }); } },

            // table 2
            { 'rezField': 'dec_table2_row_r010c3', 'callback': _mywebform_expression_dec_table2_row_r010c3, 'err': '050', 'text': function () { return Drupal.t('Anexa 2 Rd.010 col.@col = Rd 011 + Rd 012 + Rd 013 + Rd 014 + Rd 015 + Rd 016 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table2_row_r010c4', 'callback': _mywebform_expression_dec_table2_row_r010c4, 'err': '050', 'text': function () { return Drupal.t('Anexa 2 Rd.010 col.@col = Rd 011 + Rd 012 + Rd 013 + Rd 014 + Rd 015 + Rd 016 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table2_row_r020c3', 'callback': _mywebform_expression_dec_table2_row_r020c3, 'err': '051', 'text': function () { return Drupal.t('Anexa 2 Rd.020 col.@col = Rd 021 + Rd 022 + Rd 023 + Rd 024 + Rd 025 + Rd 026 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table2_row_r020c4', 'callback': _mywebform_expression_dec_table2_row_r020c4, 'err': '051', 'text': function () { return Drupal.t('Anexa 2 Rd.020 col.@col = Rd 021 + Rd 022 + Rd 023 + Rd 024 + Rd 025 + Rd 026 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table2_row_r030c3', 'callback': _mywebform_expression_dec_table2_row_r030c3, 'err': '052', 'text': function () { return Drupal.t('Anexa 2 Rd.030 col.@col = Rd 010 - Rd 020 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table2_row_r030c4', 'callback': _mywebform_expression_dec_table2_row_r030c4, 'err': '052', 'text': function () { return Drupal.t('Anexa 2 Rd.030 col.@col = Rd 010 - Rd 020 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table2_row_r080c3', 'callback': _mywebform_expression_dec_table2_row_r080c3, 'err': '053', 'text': function () { return Drupal.t('Anexa 2 Rd.080 col.@col = Rd 030 + Rd 040 - Rd 050 - Rd 060 - Rd 070', { '@col': 3 }); } },
            { 'rezField': 'dec_table2_row_r080c4', 'callback': _mywebform_expression_dec_table2_row_r080c4, 'err': '053', 'text': function () { return Drupal.t('Anexa 2 Rd.080 col.@col = Rd 030 + Rd 040 - Rd 050 - Rd 060 - Rd 070', { '@col': 4 }); } },
            { 'rezField': 'dec_table2_row_r110c3', 'callback': _mywebform_expression_dec_table2_row_r110c3, 'err': '059', 'text': function () { return Drupal.t('Anexa 2 Rd.110 col.@col = Rd 090 - Rd 100 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table2_row_r110c4', 'callback': _mywebform_expression_dec_table2_row_r110c4, 'err': '059', 'text': function () { return Drupal.t('Anexa 2 Rd.110 col.@col = Rd 090 - Rd 100 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table2_row_r140c3', 'callback': _mywebform_expression_dec_table2_row_r140c3, 'err': '060', 'text': function () { return Drupal.t('Anexa 2 Rd.140 col.@col = Rd 120 - Rd 130 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table2_row_r140c4', 'callback': _mywebform_expression_dec_table2_row_r140c4, 'err': '060', 'text': function () { return Drupal.t('Anexa 2 Rd.140 col.@col = Rd 120 - Rd 130 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table2_row_r150c3', 'callback': _mywebform_expression_dec_table2_row_r150c3, 'err': '061', 'text': function () { return Drupal.t('Anexa 2 Rd.150 col.@col = Rd 110 + Rd 140 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table2_row_r150c4', 'callback': _mywebform_expression_dec_table2_row_r150c4, 'err': '061', 'text': function () { return Drupal.t('Anexa 2 Rd.150 col.@col = Rd 110 + Rd 140 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table2_row_r160c3', 'callback': _mywebform_expression_dec_table2_row_r160c3, 'err': '062', 'text': function () { return Drupal.t('Anexa 2 Rd.160 col.@col = Rd 080 + Rd 150 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table2_row_r160c4', 'callback': _mywebform_expression_dec_table2_row_r160c4, 'err': '062', 'text': function () { return Drupal.t('Anexa 2 Rd.160 col.@col = Rd 080 + Rd 150 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table2_row_r180c3', 'callback': _mywebform_expression_dec_table2_row_r180c3, 'err': '063', 'text': function () { return Drupal.t('Anexa 2 Rd.180 col.@col = Rd 160 - Rd 170 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table2_row_r180c4', 'callback': _mywebform_expression_dec_table2_row_r180c4, 'err': '063', 'text': function () { return Drupal.t('Anexa 2 Rd.180 col.@col = Rd 160 - Rd 170 col.@col', { '@col': 4 }); } },

            // table 3
            { 'rezField': 'dec_table3_row_r060c4', 'callback': _mywebform_expression_dec_table3_row_r060c4, 'err': '070', 'text': function () { return Drupal.t('Anexa 3 Rd.060 col.@col = Rd 010 + Rd 020 + Rd 030 + Rd 040 + Rd 050 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table3_row_r060c5', 'callback': _mywebform_expression_dec_table3_row_r060c5, 'err': '070', 'text': function () { return Drupal.t('Anexa 3 Rd.060 col.@col = Rd 010 + Rd 020 + Rd 030 + Rd 040 + Rd 050 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table3_row_r060c6', 'callback': _mywebform_expression_dec_table3_row_r060c6, 'err': '070', 'text': function () { return Drupal.t('Anexa 3 Rd.060 col.@col = Rd 010 + Rd 020 + Rd 030 + Rd 040 + Rd 050 col.@col', { '@col': 6 }); } },
            { 'rezField': 'dec_table3_row_r060c7', 'callback': _mywebform_expression_dec_table3_row_r060c7, 'err': '070', 'text': function () { return Drupal.t('Anexa 3 Rd.060 col.@col = Rd 010 + Rd 020 + Rd 030 + Rd 040 + Rd 050 col.@col', { '@col': 7 }); } },
            { 'rezField': 'dec_table3_row_r110c4', 'callback': _mywebform_expression_dec_table3_row_r110c4, 'err': '071', 'text': function () { return Drupal.t('Anexa 3 Rd.110 col.@col = Rd 080 + Rd 090 + Rd 100 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table3_row_r110c5', 'callback': _mywebform_expression_dec_table3_row_r110c5, 'err': '071', 'text': function () { return Drupal.t('Anexa 3 Rd.110 col.@col = Rd 080 + Rd 090 + Rd 100 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table3_row_r110c6', 'callback': _mywebform_expression_dec_table3_row_r110c6, 'err': '071', 'text': function () { return Drupal.t('Anexa 3 Rd.110 col.@col = Rd 080 + Rd 090 + Rd 100 col.@col', { '@col': 6 }); } },
            { 'rezField': 'dec_table3_row_r110c7', 'callback': _mywebform_expression_dec_table3_row_r110c7, 'err': '071', 'text': function () { return Drupal.t('Anexa 3 Rd.110 col.@col = Rd 080 + Rd 090 + Rd 100 col.@col', { '@col': 7 }); } },
            { 'rezField': 'dec_table3_row_r160c4', 'callback': _mywebform_expression_dec_table3_row_r160c4, 'err': '072', 'text': function () { return Drupal.t('Anexa 3 Rd.160 col.@col = Rd 120 + Rd 130 + Rd 140 + Rd 150 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table3_row_r160c5', 'callback': _mywebform_expression_dec_table3_row_r160c5, 'err': '072', 'text': function () { return Drupal.t('Anexa 3 Rd.160 col.@col = Rd 120 + Rd 130 + Rd 140 + Rd 150 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table3_row_r160c6', 'callback': _mywebform_expression_dec_table3_row_r160c6, 'err': '072', 'text': function () { return Drupal.t('Anexa 3 Rd.160 col.@col = Rd 120 + Rd 130 + Rd 140 + Rd 150 col.@col', { '@col': 6 }); } },
            { 'rezField': 'dec_table3_row_r160c7', 'callback': _mywebform_expression_dec_table3_row_r160c7, 'err': '072', 'text': function () { return Drupal.t('Anexa 3 Rd.160 col.@col = Rd 120 + Rd 130 + Rd 140 + Rd 150 col.@col', { '@col': 7 }); } },
            { 'rezField': 'dec_table3_row_r190c4', 'callback': _mywebform_expression_dec_table3_row_r190c4, 'err': '073', 'text': function () { return Drupal.t('Anexa 3 Rd.190 col.@col = Rd 060 + Rd 070 + Rd 110 + Rd 160 + Rd 170 + Rd 180 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table3_row_r190c5', 'callback': _mywebform_expression_dec_table3_row_r190c5, 'err': '073', 'text': function () { return Drupal.t('Anexa 3 Rd.190 col.@col = Rd 060 + Rd 070 + Rd 110 + Rd 160 + Rd 170 + Rd 180 col.@col', { '@col': 5 }); } },
            { 'rezField': 'dec_table3_row_r190c6', 'callback': _mywebform_expression_dec_table3_row_r190c6, 'err': '073', 'text': function () { return Drupal.t('Anexa 3 Rd.190 col.@col = Rd 060 + Rd 070 + Rd 110 + Rd 160 + Rd 170 + Rd 180 col.@col', { '@col': 6 }); } },
            { 'rezField': 'dec_table3_row_r190c7', 'callback': _mywebform_expression_dec_table3_row_r190c7, 'err': '073', 'text': function () { return Drupal.t('Anexa 3 Rd.190 col.@col = Rd 060 + Rd 070 + Rd 110 + Rd 160 + Rd 170 + Rd 180 col.@col', { '@col': 7 }); } },
            { 'rezField': 'dec_table3_row_r010c7', 'callback': _mywebform_expression_dec_table3_row_r010c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '010' }); } },
            { 'rezField': 'dec_table3_row_r020c7', 'callback': _mywebform_expression_dec_table3_row_r020c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '020' }); } },
            { 'rezField': 'dec_table3_row_r030c7', 'callback': _mywebform_expression_dec_table3_row_r030c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '030' }); } },
            { 'rezField': 'dec_table3_row_r040c7', 'callback': _mywebform_expression_dec_table3_row_r040c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '040' }); } },
            { 'rezField': 'dec_table3_row_r050c7', 'callback': _mywebform_expression_dec_table3_row_r050c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '050' }); } },
            { 'rezField': 'dec_table3_row_r070c7', 'callback': _mywebform_expression_dec_table3_row_r070c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '070' }); } },
            { 'rezField': 'dec_table3_row_r080c7', 'callback': _mywebform_expression_dec_table3_row_r080c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '080' }); } },
            { 'rezField': 'dec_table3_row_r090c7', 'callback': _mywebform_expression_dec_table3_row_r090c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '090' }); } },
            { 'rezField': 'dec_table3_row_r100c7', 'callback': _mywebform_expression_dec_table3_row_r100c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '100' }); } },
            { 'rezField': 'dec_table3_row_r120c7', 'callback': _mywebform_expression_dec_table3_row_r120c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.5 - col.6 = col.7', { '@row': '120' }); } },
            { 'rezField': 'dec_table3_row_r130c7', 'callback': _mywebform_expression_dec_table3_row_r130c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '130' }); } },
            { 'rezField': 'dec_table3_row_r140c7', 'callback': _mywebform_expression_dec_table3_row_r140c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.5 - col.6 = col.7', { '@row': '140' }); } },
            { 'rezField': 'dec_table3_row_r150c7', 'callback': _mywebform_expression_dec_table3_row_r150c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.5 - col.6 = col.7', { '@row': '150' }); } },
            { 'rezField': 'dec_table3_row_r170c7', 'callback': _mywebform_expression_dec_table3_row_r170c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '170' }); } },
            { 'rezField': 'dec_table3_row_r180c7', 'callback': _mywebform_expression_dec_table3_row_r180c7, 'err': '075', 'text': function () { return Drupal.t('Anexa 3 Rd.@row col.4 + col.5 - col.6 = col.7', { '@row': '180' }); } },

            // table 4
            { 'rezField': 'dec_table4_row_r080c3', 'callback': _mywebform_expression_dec_table4_row_r080c3, 'err': '080', 'text': function () { return Drupal.t('Anexa 4 Rd.080 col.@col = Rd 010 - Rd 020 - Rd 030 - Rd 040 - Rd 050 + Rd 060 - Rd 070 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table4_row_r080c4', 'callback': _mywebform_expression_dec_table4_row_r080c4, 'err': '080', 'text': function () { return Drupal.t('Anexa 4 Rd.080 col.@col = Rd 010 - Rd 020 - Rd 030 - Rd 040 - Rd 050 + Rd 060 - Rd 070 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table4_row_r140c3', 'callback': _mywebform_expression_dec_table4_row_r140c3, 'err': '081', 'text': function () { return Drupal.t('Anexa 4 Rd.140 col.@col = Rd 090 - Rd 100 + Rd 110 + Rd 120 + Rd 130 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table4_row_r140c4', 'callback': _mywebform_expression_dec_table4_row_r140c4, 'err': '081', 'text': function () { return Drupal.t('Anexa 4 Rd.140 col.@col = Rd 090 - Rd 100 + Rd 110 + Rd 120 + Rd 130 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table4_row_r200c3', 'callback': _mywebform_expression_dec_table4_row_r200c3, 'err': '082', 'text': function () { return Drupal.t('Anexa 4 Rd.200 col.@col = Rd 150 - Rd 160 - Rd 170 + Rd 180 + Rd 190 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table4_row_r200c4', 'callback': _mywebform_expression_dec_table4_row_r200c4, 'err': '082', 'text': function () { return Drupal.t('Anexa 4 Rd.200 col.@col = Rd 150 - Rd 160 - Rd 170 + Rd 180 + Rd 190 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table4_row_r210c3', 'callback': _mywebform_expression_dec_table4_row_r210c3, 'err': '083', 'text': function () { return Drupal.t('Anexa 4 Rd.210 col.@col = Rd 080 + Rd 140 + Rd 200 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table4_row_r210c4', 'callback': _mywebform_expression_dec_table4_row_r210c4, 'err': '083', 'text': function () { return Drupal.t('Anexa 4 Rd.210 col.@col = Rd 080 + Rd 140 + Rd 200 col.@col', { '@col': 4 }); } },
            { 'rezField': 'dec_table4_row_r240c3', 'callback': _mywebform_expression_dec_table4_row_r240c3, 'err': '084', 'text': function () { return Drupal.t('Anexa 4 Rd.240 col.@col = Rd 210 + Rd 220 + Rd 230 col.@col', { '@col': 3 }); } },
            { 'rezField': 'dec_table4_row_r240c4', 'callback': _mywebform_expression_dec_table4_row_r240c4, 'err': '084', 'text': function () { return Drupal.t('Anexa 4 Rd.240 col.@col = Rd 210 + Rd 220 + Rd 230 col.@col', { '@col': 4 }); } },
        ];

        for (var i = 0; i < autofield_exp.length; i++) {
            validate_autofields(autofield_exp[i]);
        }

        var comparable_err_msg_callback = function (annex, row, col, op, comp_annex, comp_row, comp_col) {
            return function () {
                return Drupal.t('Anexa @annex rd.@row col.@col @op Anexa @comp_annex rd.@comp_row col.@comp_col', {
                    '@annex': annex,
                    '@row': row,
                    '@col': col,
                    '@op': op,
                    '@comp_annex': comp_annex,
                    '@comp_row': comp_row,
                    '@comp_col': comp_col
                });
            };
        };

        var table2_090_comparable_value = function (column) {
            return function () {
                var value = toFloat(values['dec_table2_row_r091c' + column]) +
                    toFloat(values['dec_table2_row_r093c' + column]) +
                    toFloat(values['dec_table2_row_r095c' + column]) +
                    toFloat(values['dec_table2_row_r097c' + column]) +
                    toFloat(values['dec_table2_row_r098c' + column]) +
                    toFloat(values['dec_table2_row_r099c' + column]);

                return formatNumber(value, 0);
            };
        };

        var table2_100_comparable_value = function (column) {
            return function () {
                var value = toFloat(values['dec_table2_row_r101c' + column]) +
                    toFloat(values['dec_table2_row_r103c' + column]) +
                    toFloat(values['dec_table2_row_r104c' + column]) +
                    toFloat(values['dec_table2_row_r105c' + column]);

                return formatNumber(value, 0);
            };
        };

        var table3_table1_error_actuality = isEntityMediumLarge() || isTablesCompleted(['table3']);
        var table4_table1_error_actuality = isEntityMediumLarge() || isTablesCompleted(['table4']);

        var comparable_fields = [
            // common expressions
            { 'field': 'dec_table2_row_r180c4', 'comparable_field': 'dec_table1_row_r570c5', 'err': '090', 'validate': true, 'op': '!=', 'text': comparable_err_msg_callback(2, '180', 4, '=', 1, '570', 5) },
            { 'field': 'dec_table3_row_r010c4', 'comparable_field': 'dec_table1_row_r440c4', 'err': '091', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '010', 4, '=', 1, '440', 4) },
            { 'field': 'dec_table3_row_r010c7', 'comparable_field': 'dec_table1_row_r440c5', 'err': '092', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '010', 7, '=', 1, '440', 5) },
            { 'field': 'dec_table3_row_r020c4', 'comparable_field': 'dec_table1_row_r450c4', 'err': '093', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '020', 4, '=', 1, '450', 4) },
            { 'field': 'dec_table3_row_r020c7', 'comparable_field': 'dec_table1_row_r450c5', 'err': '094', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '020', 7, '=', 1, '450', 5) },
            { 'field': 'dec_table3_row_r030c4', 'comparable_field': 'dec_table1_row_r460c4', 'err': '095', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '030', 4, '=', 1, '460', 4) },
            { 'field': 'dec_table3_row_r030c7', 'comparable_field': 'dec_table1_row_r460c5', 'err': '096', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '030', 7, '=', 1, '460', 5) },
            { 'field': 'dec_table3_row_r040c4', 'comparable_field': 'dec_table1_row_r470c4', 'err': '097', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '040', 4, '=', 1, '470', 4) },
            { 'field': 'dec_table3_row_r040c7', 'comparable_field': 'dec_table1_row_r470c5', 'err': '098', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '040', 7, '=', 1, '470', 5) },
            { 'field': 'dec_table3_row_r050c4', 'comparable_field': 'dec_table1_row_r480c4', 'err': '099', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '050', 4, '=', 1, '480', 4) },
            { 'field': 'dec_table3_row_r050c7', 'comparable_field': 'dec_table1_row_r480c5', 'err': '100', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '050', 7, '=', 1, '480', 5) },
            { 'field': 'dec_table3_row_r070c4', 'comparable_field': 'dec_table1_row_r500c4', 'err': '101', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '070', 4, '=', 1, '500', 4) },
            { 'field': 'dec_table3_row_r070c7', 'comparable_field': 'dec_table1_row_r500c5', 'err': '102', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '070', 7, '=', 1, '500', 5) },
            { 'field': 'dec_table3_row_r080c4', 'comparable_field': 'dec_table1_row_r510c4', 'err': '103', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '080', 4, '=', 1, '510', 4) },
            { 'field': 'dec_table3_row_r080c7', 'comparable_field': 'dec_table1_row_r510c5', 'err': '104', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '080', 7, '=', 1, '510', 5) },
            { 'field': 'dec_table3_row_r090c4', 'comparable_field': 'dec_table1_row_r520c4', 'err': '105', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '090', 4, '=', 1, '520', 4) },
            { 'field': 'dec_table3_row_r090c7', 'comparable_field': 'dec_table1_row_r520c5', 'err': '106', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '090', 7, '=', 1, '520', 5) },
            { 'field': 'dec_table3_row_r100c4', 'comparable_field': 'dec_table1_row_r530c4', 'err': '107', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '100', 4, '=', 1, '530', 4) },
            { 'field': 'dec_table3_row_r100c7', 'comparable_field': 'dec_table1_row_r530c5', 'err': '108', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '100', 7, '=', 1, '530', 5) },
            { 'field': 'dec_table3_row_r120c7', 'comparable_field': 'dec_table1_row_r550c5', 'err': '110', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '120', 7, '=', 1, '550', 5) },
            { 'field': 'dec_table3_row_r130c4', 'comparable_field': 'dec_table1_row_r560c4', 'err': '111', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '130', 4, '=', 1, '560', 4) },
            { 'field': 'dec_table3_row_r130c7', 'comparable_field': 'dec_table1_row_r560c5', 'err': '112', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '130', 7, '=', 1, '560', 5) },
            { 'field': 'dec_table3_row_r140c7', 'comparable_field': 'dec_table1_row_r570c5', 'err': '114', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '140', 7, '=', 1, '570', 5) },
            { 'field': 'dec_table3_row_r150c7', 'comparable_field': 'dec_table1_row_r580c5', 'err': '116', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '150', 7, '=', 1, '580', 5) },
            { 'field': 'dec_table3_row_r170c4', 'comparable_field': 'dec_table1_row_r600c4', 'err': '117', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '170', 4, '=', 1, '600', 4) },
            { 'field': 'dec_table3_row_r170c7', 'comparable_field': 'dec_table1_row_r600c5', 'err': '118', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '170', 7, '=', 1, '600', 5) },
            { 'field': 'dec_table3_row_r180c4', 'comparable_field': 'dec_table1_row_r610c4', 'err': '119', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '180', 4, '=', 1, '610', 4) },
            { 'field': 'dec_table3_row_r180c7', 'comparable_field': 'dec_table1_row_r610c5', 'err': '120', 'validate': table3_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(3, '180', 7, '=', 1, '610', 5) },
            { 'field': 'dec_table4_row_r230c4', 'comparable_field': 'dec_table1_row_r410c4', 'err': '121', 'validate': table4_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(4, '230', 4, '=', 1, '410', 4) },
            { 'field': 'dec_table4_row_r240c4', 'comparable_field': 'dec_table1_row_r410c5', 'err': '122', 'validate': table4_table1_error_actuality, 'op': '!=', 'text': comparable_err_msg_callback(4, '240', 4, '=', 1, '410', 5) },

            //table 1
            { 'field': 'dec_table1_row_r180c4', 'comparable_field': 'dec_table1_row_r181c4', 'err': '043', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '180', 4, '>=', 1, '181', 4) },
            { 'field': 'dec_table1_row_r180c5', 'comparable_field': 'dec_table1_row_r181c5', 'err': '043', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '180', 5, '>=', 1, '181', 5) },
            { 'field': 'dec_table1_row_r310c4', 'comparable_field': 'dec_table1_row_r311c4', 'err': '020', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '310', 4, '>=', 1, '311', 4) },
            { 'field': 'dec_table1_row_r310c5', 'comparable_field': 'dec_table1_row_r311c5', 'err': '020', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '310', 5, '>=', 1, '311', 5) },
            { 'field': 'dec_table1_row_r641c4', 'comparable_field': 'dec_table1_row_r642c4', 'err': '032', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '641', 4, '>=', 1, '642', 4) },
            { 'field': 'dec_table1_row_r641c5', 'comparable_field': 'dec_table1_row_r642c5', 'err': '032', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '641', 5, '>=', 1, '642', 5) },
            { 'field': 'dec_table1_row_r660c4', 'comparable_field': 'dec_table1_row_r661c4', 'err': '033', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '660', 4, '>=', 1, '661', 4) },
            { 'field': 'dec_table1_row_r660c5', 'comparable_field': 'dec_table1_row_r661c5', 'err': '033', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '660', 5, '>=', 1, '661', 5) },
            { 'field': 'dec_table1_row_r721c4', 'comparable_field': 'dec_table1_row_r722c4', 'err': '036', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '721', 4, '>=', 1, '722', 4) },
            { 'field': 'dec_table1_row_r721c5', 'comparable_field': 'dec_table1_row_r722c5', 'err': '036', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '721', 5, '>=', 1, '722', 5) },
            { 'field': 'dec_table1_row_r740c4', 'comparable_field': 'dec_table1_row_r741c4', 'err': '037', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '740', 4, '>=', 1, '741', 4) },
            { 'field': 'dec_table1_row_r740c5', 'comparable_field': 'dec_table1_row_r741c5', 'err': '037', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(1, '740', 5, '>=', 1, '741', 5) },
            { 'field': 'dec_table1_row_r430c4', 'comparable_field': 'dec_table1_row_r880c4', 'err': '040', 'validate': true, 'op': '!=', 'text': comparable_err_msg_callback(1, '430', 4, '=', 1, '880', 4) },
            { 'field': 'dec_table1_row_r430c5', 'comparable_field': 'dec_table1_row_r880c5', 'err': '040', 'validate': true, 'op': '!=', 'text': comparable_err_msg_callback(1, '430', 5, '=', 1, '880', 5) },

            // table 2
            { 'field': 'dec_table2_row_r090c3', 'comparable_field': table2_090_comparable_value(3), 'err': '054', 'validate': true, 'op': '<', 'text': function () { return Drupal.t('Anexa 2 Rd.090 col.@col >= Rd 091 + Rd 093 + Rd 095 + Rd 097 + Rd 098 + Rd 099 col.@col', { '@col': 3 }); } },
            { 'field': 'dec_table2_row_r090c4', 'comparable_field': table2_090_comparable_value(4), 'err': '054', 'validate': true, 'op': '<', 'text': function () { return Drupal.t('Anexa 2 Rd.090 col.@col >= Rd 091 + Rd 093 + Rd 095 + Rd 097 + Rd 098 + Rd 099 col.@col', { '@col': 4 }); } },
            { 'field': 'dec_table2_row_r091c3', 'comparable_field': 'dec_table2_row_r092c3', 'err': '055', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(2, '091', 3, '>=', 2, '092', 3) },
            { 'field': 'dec_table2_row_r091c4', 'comparable_field': 'dec_table2_row_r092c4', 'err': '055', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(2, '091', 4, '>=', 2, '092', 4) },
            { 'field': 'dec_table2_row_r093c3', 'comparable_field': 'dec_table2_row_r094c3', 'err': '056', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(2, '093', 3, '>=', 2, '094', 3) },
            { 'field': 'dec_table2_row_r093c4', 'comparable_field': 'dec_table2_row_r094c4', 'err': '056', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(2, '093', 4, '>=', 2, '094', 4) },
            { 'field': 'dec_table2_row_r095c3', 'comparable_field': 'dec_table2_row_r096c3', 'err': '057', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(2, '095', 3, '>=', 2, '096', 3) },
            { 'field': 'dec_table2_row_r095c4', 'comparable_field': 'dec_table2_row_r096c4', 'err': '057', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(2, '095', 4, '>=', 2, '096', 4) },
            { 'field': 'dec_table2_row_r100c3', 'comparable_field': table2_100_comparable_value(3), 'err': '058', 'validate': true, 'op': '<', 'text': function () { return Drupal.t('Anexa 2 Rd.100 col.@col >= Rd 101 + Rd 103 + Rd 104 + Rd 105 col.@col', { '@col': 3 }); } },
            { 'field': 'dec_table2_row_r100c4', 'comparable_field': table2_100_comparable_value(4), 'err': '058', 'validate': true, 'op': '<', 'text': function () { return Drupal.t('Anexa 2 Rd.100 col.@col >= Rd 101 + Rd 103 + Rd 104 + Rd 105 col.@col', { '@col': 4 }); } },
            { 'field': 'dec_table2_row_r101c3', 'comparable_field': 'dec_table2_row_r102c3', 'err': '066', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(2, '101', 3, '>=', 2, '102', 3) },
            { 'field': 'dec_table2_row_r101c4', 'comparable_field': 'dec_table2_row_r102c4', 'err': '066', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(2, '101', 4, '>=', 2, '102', 4) },

            // table 4
            { 'field': 'dec_table4_row_r230c4', 'comparable_field': 'dec_table4_row_r240c3', 'err': '086', 'validate': values.dec_table4_row_r240c3 > 0, 'op': '!=', 'text': comparable_err_msg_callback(4, '230', 4, '=', 4, '240', 3) },
            { 'field': 'dec_table4_row_r170c3', 'comparable_field': 'dec_table4_row_r171c3', 'err': '087', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(4, '170', 3, '>=', 4, '171', 3) },
            { 'field': 'dec_table4_row_r170c4', 'comparable_field': 'dec_table4_row_r171c4', 'err': '087', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(4, '170', 4, '>=', 4, '171', 4) },
            { 'field': 'dec_table4_row_r120c3', 'comparable_field': 'dec_table4_row_r121c3', 'err': '088', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(4, '120', 3, '>=', 4, '121', 3) },
            { 'field': 'dec_table4_row_r120c4', 'comparable_field': 'dec_table4_row_r121c4', 'err': '088', 'validate': true, 'op': '<', 'text': comparable_err_msg_callback(4, '120', 4, '>=', 4, '121', 4) },
        ];

        for (var i = 0; i < comparable_fields.length; i++) {
            compare_fields(comparable_fields[i]);
        }

        if (!values.dec_fiscCod_street) {
            webform.warnings.push({
                "fieldName": "dec_fiscCod_street",
                "msg": Drupal.t('Câmpul nu este completat')
            });
        }

        webform.validatorsStatus.validate_rsf1_1 = 1;
        validateWebform();
    };

    webform.validators.validate_rsf1_a1 = function () {
        msg = concatMessage('57-041', '', Drupal.t("Anexa 1 Valoarea trebuie sa fie pozitivă"));
        validatePositiveFields('.annex-1', msg, 41);

        if (!isTableCompleted('table1')) {
            webform.warnings.push({
                'fieldName': '',
                'index': 0,
                'weight': 42,
                'msg': concatMessage('57-042', '', Drupal.t('Nu este completată Anexa 1 „Bilanţul”')),
            });
        }

        webform.validatorsStatus.validate_rsf1_a1 = 1;
        validateWebform();
    };

    webform.validators.validate_rsf1_a2 = function () {
        var values = Drupal.settings.mywebform.values;

        msg = concatMessage('57-064', '', Drupal.t("Anexa 2 Valoarea trebuie sa fie pozitivă"));
        validatePositiveFields('.annex-2', msg, 64);

        if (!isTableCompleted('table2')) {
            webform.warnings.push({
                'fieldName': '',
                'index': 0,
                'weight': 65,
                'msg': concatMessage('57-065', '', Drupal.t('Nu este completată Anexa 2 „Situaţia de profit şi pierdere”')),
            });
        }

        if (toFloat(values.dec_table2_row_r021c3) > 0 && !toFloat(values.dec_table2_row_r011c3)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r011c3',
                'weight': 130,
                'msg': concatMessage('57-130', '', Drupal.t('Daca Anexa 2 rd.021 col.3 > 0 atunci Anexa 2 rd.011 col.3 > 0')),
            });
        }

        if (toFloat(values.dec_table2_row_r021c4) > 0 && !toFloat(values.dec_table2_row_r011c4)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r011c4',
                'weight': 130,
                'msg': concatMessage('57-130', '', Drupal.t('Daca Anexa 2 rd.021 col.4 > 0 atunci Anexa 2 rd.011 col.4 > 0')),
            });
        }

        if (toFloat(values.dec_table2_row_r022c3) > 0 && !toFloat(values.dec_table2_row_r012c3)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r012c3',
                'weight': 131,
                'msg': concatMessage('57-131', '', Drupal.t('Daca Anexa 2 rd.022 col.3 > 0 atunci Anexa 2 rd.012 col.3 > 0')),
            });
        }

        if (toFloat(values.dec_table2_row_r022c4) > 0 && !toFloat(values.dec_table2_row_r012c4)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r012c4',
                'weight': 131,
                'msg': concatMessage('57-131', '', Drupal.t('Daca Anexa 2 rd.022 col.4 > 0 atunci Anexa 2 rd.012 col.4 > 0')),
            });
        }

        if (toFloat(values.dec_table2_row_r023c3) > 0 && !toFloat(values.dec_table2_row_r013c3)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r013c3',
                'weight': 132,
                'msg': concatMessage('57-132', '', Drupal.t('Daca Anexa 2 rd.023 col.3 > 0 atunci Anexa 2 rd.013 col.3 > 0')),
            });
        }

        if (toFloat(values.dec_table2_row_r023c4) > 0 && !toFloat(values.dec_table2_row_r013c4)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r013c4',
                'weight': 132,
                'msg': concatMessage('57-132', '', Drupal.t('Daca Anexa 2 rd.023 col.4 > 0 atunci Anexa 2 rd.013 col.4 > 0')),
            });
        }

        if (toFloat(values.dec_table2_row_r024c3) > 0 && !toFloat(values.dec_table2_row_r014c3)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r014c3',
                'weight': 133,
                'msg': concatMessage('57-133', '', Drupal.t('Daca Anexa 2 rd.024 col.3 > 0 atunci Anexa 2 rd.014 col.3 > 0')),
            });
        }

        if (toFloat(values.dec_table2_row_r024c4) > 0 && !toFloat(values.dec_table2_row_r014c4)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r014c4',
                'weight': 133,
                'msg': concatMessage('57-133', '', Drupal.t('Daca Anexa 2 rd.024 col.4 > 0 atunci Anexa 2 rd.014 col.4 > 0')),
            });
        }

        if (toFloat(values.dec_table2_row_r025c3) > 0 && !toFloat(values.dec_table2_row_r015c3)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r015c3',
                'weight': 134,
                'msg': concatMessage('57-134', '', Drupal.t('Daca Anexa 2 rd.025 col.3 > 0 atunci Anexa 2 rd.015 col.3 > 0')),
            });
        }

        if (toFloat(values.dec_table2_row_r025c4) > 0 && !toFloat(values.dec_table2_row_r015c4)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r015c4',
                'weight': 134,
                'msg': concatMessage('57-134', '', Drupal.t('Daca Anexa 2 rd.025 col.4 > 0 atunci Anexa 2 rd.015 col.4 > 0')),
            });
        }

        if (toFloat(values.dec_table2_row_r026c3) > 0 && !toFloat(values.dec_table2_row_r016c3)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r016c3',
                'weight': 135,
                'msg': concatMessage('57-135', '', Drupal.t('Daca Anexa 2 rd.026 col.3 > 0 atunci Anexa 2 rd.016 col.3 > 0')),
            });
        }

        if (toFloat(values.dec_table2_row_r026c4) > 0 && !toFloat(values.dec_table2_row_r016c4)) {
            webform.errors.push({
                'fieldName': 'dec_table2_row_r016c4',
                'weight': 135,
                'msg': concatMessage('57-135', '', Drupal.t('Daca Anexa 2 rd.026 col.4 > 0 atunci Anexa 2 rd.016 col.4 > 0')),
            });
        }

        webform.validatorsStatus.validate_rsf1_a2 = 1;
        validateWebform();
    };

    webform.validators.validate_rsf1_a3 = function () {
        msg = concatMessage('57-074', '', Drupal.t("Anexa 3 Valoarea trebuie sa fie pozitivă"));
        validatePositiveFields('.annex-3', msg, 74);

        webform.validatorsStatus.validate_rsf1_a3 = 1;
        validateWebform();
    };

    webform.validators.validate_rsf1_a4 = function () {
        msg = concatMessage('57-085', '', Drupal.t("Anexa 4 Valoarea trebuie sa fie pozitivă"));
        validatePositiveFields('.annex-4', msg, 85);

        webform.validatorsStatus.validate_rsf1_a4 = 1;
        validateWebform();
    };

    webform.validators.rsf1_last_validator = function () {
        prepare_errors('errors');
        prepare_errors('warnings');

        //Sort warnings & errors
        webform.warnings.sort(function (a, b) {
            return sort_errors_warinings(a, b);
        });

        webform.errors.sort(function (a, b) {
            return sort_errors_warinings(a, b);
        });

        webform.validatorsStatus.rsf1_last_validator = 1;
        validateWebform();
    };

    function delete_unnecessary_cfp_options() {
        var unnecessary_opt = [10, 21, 25, 27];

        for (var i = 0; i < Drupal.settings.mywebform.fields.dec_fiscCod_cfp.options.length; i++) {
            if (unnecessary_opt.indexOf(Drupal.settings.mywebform.fields.dec_fiscCod_cfp.options[i].id) !== -1) {
                Drupal.settings.mywebform.fields.dec_fiscCod_cfp.options.splice(i, 1);
                i--;
            }
        }
    }

    function concatMessage(errorCode, fieldTitle, msg) {
        var titleParts = [];

        if (errorCode) {
            titleParts.push(getErrorMessage(errorCode));
        }

        if (fieldTitle) {
            titleParts.push(fieldTitle);
        }

        if (titleParts.length) {
            msg = titleParts.join(', ') + ' - ' + msg;
        }

        return msg;
    }

    function getFieldTitle(field) {
        return Drupal.settings.mywebform.fields[field].title;
    }

    function getErrorMessage(errorCode) {
        return Drupal.t('Error code: @error_code', { '@error_code': errorCode });
    }

    function isErrorMessageWithCode(msg) {
        if (msg) {
            var regexp = /57-\d+/;
            if (regexp.test(msg)) {
                return true;
            }
        }

        return false;
    }

    function isLeap(year) {
        return new Date(year, 1, 29).getDate() === 29;
    }

    function identifyCompletedTables(reset) {
        if (!completedTables.processed || reset) {
            var values = Drupal.settings.mywebform.values;
            completedTables = {
                'processed': true,
                'tables': {}
            };
            for (var fieldName in values) {
                var exp = /^dec_(table\d*|dinamicTable\d*)_/;
                var result = fieldName.match(exp);

                if (result) {
                    if (!completedTables.tables.hasOwnProperty(result[1])) {
                        if (values[fieldName] instanceof Array) {
                            if (values[fieldName].length > 1) {
                                completedTables.tables[result[1]] = true;
                            } else if (values[fieldName].length == 1) {
                                var gridName = Drupal.settings.mywebform.fields[fieldName].grid_name;
                                var indexField = Drupal.settings.mywebform.grids[gridName].defField;

                                if (fieldName != indexField) {
                                    if (values[fieldName][0] !== '' && values[fieldName][0] !== null) {
                                        completedTables.tables[result[1]] = true;
                                    }
                                }
                            }
                        } else {
                            if (values[fieldName] !== '' && values[fieldName] !== null) {
                                completedTables.tables[result[1]] = true;
                            }
                        }
                    }
                }
            }
        }
    }

    function isTableCompleted(table) {
        if (completedTables.tables.hasOwnProperty(table) && completedTables.tables[table]) {
            return true;
        }

        return false;
    }

    function isTablesCompleted(tables) {
        for (var i = 0; i < tables.length; i++) {
            if (!isTableCompleted(tables[i])) {
                return false;
            }
        }

        return true;
    }

    function validatePositiveFields(selector, msg, weight) {
        var values = Drupal.settings.mywebform.values;
        var error = false;

        jQuery(selector + ' input').each(function () {
            var fieldName = jQuery(this).attr('field');
            var allowNegative = jQuery(this).attr('allow-negative');

            if (!allowNegative && is_negative(values[fieldName])) {
                error = true;
                webform.errors.push({
                    'fieldName': fieldName,
                    'index': 0,
                    'msg': ''
                });
            }
        });

        if (error) {
            webform.errors.push({
                'fieldName': '',
                'index': 0,
                'weight': weight,
                'msg': msg
            });
        }
    }

    function validate_autofields(item) {
        var values = Drupal.settings.mywebform.values;
        if (item.callback() != values[item.rezField]) {
            var msg = item.text;
            if (typeof msg == 'function') {
                msg = msg();
            }

            webform.errors.push({
                'fieldName': item.rezField,
                'index': 0,
                'weight': parseInt(item.err),
                'msg': concatMessage('57-' + item.err, '', msg)
            });
        }
    }

    function compare_fields(item) {
        var values = Drupal.settings.mywebform.values;
        var validate = !item.hasOwnProperty('validate') || item.validate;

        if (validate) {
            var value = values[item.field];
            var comparable_value = 0;
            if (typeof item.comparable_field == 'function') {
                comparable_value = item.comparable_field();
            } else {
                comparable_value = values[item.comparable_field];
            }

            var expression = toFloat(value) + item.op + toFloat(comparable_value);
            if (eval(expression)) {
                var msg = item.text;
                if (typeof msg == 'function') {
                    msg = msg();
                }

                webform.errors.push({
                    'fieldName': item.field,
                    'index': 0,
                    'weight': parseInt(item.err),
                    'msg': concatMessage('57-' + item.err, '', msg)
                });
            }
        }
    }

    function sort_errors_warinings(a, b) {
        if (!a.hasOwnProperty('weight')) {
            a.weight = 9999;
        }

        if (!b.hasOwnProperty('weight')) {
            b.weight = 9999;
        }

        return toFloat(a.weight) - toFloat(b.weight);
    }

    function prepare_errors(type) {
        var dateFields = {};
        var requiredFields = {};
        var total = webform[type].length;
        var dateError = Drupal.t('Wrong field format: date needed');
        var requiredError = Drupal.t('This field is required');

        for (var i = 0; i < total; i++) {
            var error = webform[type][i];
            var fieldName = error.fieldName;
            var field = Drupal.settings.mywebform.fields.hasOwnProperty(fieldName) ? Drupal.settings.mywebform.fields[fieldName] : false;

            if (field) {
                if (field.type == 'date') {
                    if (error.msg == dateError) {
                        error.msg = '';
                        dateFields[fieldName] = field.title;
                    }
                } else if (field.type == 'period') {
                    error.msg = '';
                }

                if (field.required && error.msg == requiredError) {
                    error.msg = '';
                    requiredFields[fieldName] = field.title;
                }
            }

            if (isErrorMessageWithCode(error.msg)) {
                if (!error.hasOwnProperty('options')) {
                    error.options = {};
                }

                error.options.hide_title = true;
            }
        }

        if (Object.keys(requiredFields).length) {
            var elements = Object.values(requiredFields).join('<br />');

            webform[type].push({
                'fieldName': '',
                'weight': 10000,
                'msg': Drupal.t("<u>Cîmpuri obligatorii pentru completare:</u><br />!fields", { '!fields': elements })
            });
        }

        if (Object.keys(dateFields).length) {
            var elements = Object.values(dateFields).join('<br />');
            webform[type].push({
                'fieldName': '',
                'weight': 10001,
                'msg': Drupal.t("<u>Data trebuie să fie în formatul: ZZ.LL.AAAA, pentru:</u><br />!fields", { '!fields': elements })
            });
        }
    }

    function detectMediumLargeEntity() {
        var idno = Drupal.settings.mywebform.values.dec_fiscCod_fiscal;

        _isEntityMediumLarge = false;
        for (var key in entities_medium_large) {
            if (entities_medium_large[key].code == idno) {
                _isEntityMediumLarge = true;
                break;
            }
        }
    }

    function isEntityMediumLarge() {
        return _isEntityMediumLarge;
    }

})(jQuery);