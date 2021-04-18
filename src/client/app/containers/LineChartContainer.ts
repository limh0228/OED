/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import * as _ from 'lodash';
import * as moment from 'moment-timezone';
import { connect } from 'react-redux';
import getGraphColor from '../utils/getGraphColor';
import { State } from '../types/redux/state';
import PlotlyChart, { IPlotlyChartProps } from 'react-plotlyjs-ts';
import {TimeInterval} from '../../../common/TimeInterval';
import Locales from '../types/locales';
import { DataType } from '../types/Datasources';

function mapStateToProps(state: State) {
	const timeInterval = state.graph.timeInterval;
	const datasets: any[] = [];

	// Add all valid data from existing meters to the line plot
	for (const meterID of state.graph.selectedMeters) {
		const byMeterID = state.readings.line.byMeterID[meterID];
		if (byMeterID !== undefined) {
			const readingsData = byMeterID[timeInterval.toString()];
			console.log("In LineChartContainer: " + timeInterval.toString());
			if (readingsData !== undefined && !readingsData.isFetching) {
				const label = state.meters.byMeterID[meterID].name;
				const colorID = meterID;
				if (readingsData.readings === undefined) {
					throw new Error('Unacceptable condition: readingsData.readings is undefined.');
				}

				// Create two arrays for the x and y values. Fill the array with the data from the compressed readings
				const xData: string[] = [];
				const yData: number[] = [];
				const hoverText: string[] = [];
				const readings = _.values(readingsData.readings);
				readings.forEach(reading => {
					const timeReading = moment(reading.startTimestamp);
					xData.push(timeReading.utc().format('YYYY-MM-DD HH:mm:ss'));
					yData.push(reading.reading);
					hoverText.push(`<b> ${timeReading.format('dddd, LL LTS')} </b> <br> ${label}: ${reading.reading.toPrecision(6)} kW`);
				});

				// Save the timestamp range of the plot
				let minTimestamp: string = ''; 
				let maxTimestamp: string = '';
				if (readings.length > 0) {
					/* tslint:disable:no-string-literal */

					// When the true (user's chosen) timestamp is not an absolute max/min, 
					// 		the max and min of the plotly graph should be exactly the values chosen by the user, 
					// 		not the closest compressed value.
					// For the unbounded graph (no zoom), the max distance between compressed data
					//		points is calculated, and a buffer of this interval is added to either end of
					//		the graph to account for potentially existing, but compressed data
					//		on either side of the compressed min/max.

					let trueMinTimestamp = timeInterval.getStartTimestamp();
					let compressedMinTimestamp = readings[0]['startTimestamp'];

					// if there is only one compressed reading, find the average of its start and end time
					let compressedDataInterval = (readings[0]['startTimestamp'] - readings[0]['endTimestamp'])/2;
					if (readings.length > 1) {
						// if there is more than one compressed reading, find the interval between points
						compressedDataInterval = Math.abs(readings[0]['startTimestamp'] - readings[1]['startTimestamp']);
					}
					

					if(trueMinTimestamp != null){
						// if min time is not unbounded, use the user's exact min time
						minTimestamp = trueMinTimestamp.toString();
					} else {
						// for unbounded min, augment the compressed min timestamp by a buffer interval
						let bufferedMinTimestamp = compressedMinTimestamp - compressedDataInterval;
						// make sure buffered min is never less than zero
						bufferedMinTimestamp = Math.max(bufferedMinTimestamp, 0); 
						minTimestamp = bufferedMinTimestamp.toString();
					}

					let trueMaxTimestamp = timeInterval.getStartTimestamp();
					let compressedMaxTimestamp = readings[readings.length - 1]['startTimestamp'];

					if(trueMaxTimestamp != null){
						maxTimestamp = trueMaxTimestamp.toString();
					} else {
						let bufferedMaxTimestamp = compressedMaxTimestamp + compressedDataInterval;
						maxTimestamp = bufferedMaxTimestamp.toString();
					}
					/* tslint:enable:no-string-literal */
				}
				const root: any = document.getElementById('root');
				root.setAttribute('min-timestamp', minTimestamp);
				root.setAttribute('max-timestamp', maxTimestamp);

				// This variable contains all the elements (x and y values, line type, etc.) assigned to the data parameter of the Plotly object
				datasets.push({
					name: label,
					x: xData,
					y: yData,
					text: hoverText,
					hoverinfo: 'text',
					type: 'scatter',
					mode: 'lines',
					line: {
						shape: 'spline',
						width: 3
					},
					marker: {color: getGraphColor(colorID, DataType.Meter)}
				});
			}
		}
	}

// TODO The meters and groups code is very similar and maybe it should be refactored out to create a function to do
// both. This would mean future changes would automatically happen to both.
	// Add all valid data from existing groups to the line plot
	for (const groupID of state.graph.selectedGroups) {
		const byGroupID = state.readings.line.byGroupID[groupID];
		if (byGroupID !== undefined) {
			const readingsData = byGroupID[timeInterval.toString()];
			if (readingsData !== undefined && !readingsData.isFetching) {
				const label = state.groups.byGroupID[groupID].name;
				const colorID = groupID;
				if (readingsData.readings === undefined) {
					throw new Error('Unacceptable condition: readingsData.readings is undefined.');
				}

				// Create two arrays for the x and y values. Fill the array with the data from the compressed readings
				const xData: string[] = [];
				const yData: number[] = [];
				const hoverText: string[] = [];
				const readings = _.values(readingsData.readings);
				readings.forEach(reading => {
					const timeReading = moment(reading.startTimestamp);
					xData.push(timeReading.utc().format('YYYY-MM-DD HH:mm:ss'));
					yData.push(reading.reading);
					hoverText.push(`<b> ${timeReading.format('dddd, LL LTS')} </b> <br> ${label}: ${reading.reading.toPrecision(6)} kW`);
				});

				// This variable contains all the elements (x and y values, line type, etc.) assigned to the data parameter of the Plotly object
				datasets.push({
					name: label,
					x: xData,
					y: yData,
					text: hoverText,
					hoverinfo: 'text',
					type: 'scatter',
					mode: 'lines',
					line: {
						shape: 'spline',
						width: 3
					},
					marker: {color: getGraphColor(colorID, DataType.Group)}
				});
			}
		}
	}

	// Calculate slider interval if rangeSliderInterval is specified;
	const sliderInterval = (state.graph.rangeSliderInterval.equals(TimeInterval.unbounded())) ? timeInterval : state.graph.rangeSliderInterval;
	const start = Date.parse(moment(sliderInterval.getStartTimestamp()).toISOString());
	const end = Date.parse(moment(sliderInterval.getEndTimestamp()).toISOString());

	// Customize the layout of the plot
	const layout: any = {
		autosize: true,
		showlegend: true,
		legend: {
			x: 0,
			y: 1.1,
			orientation: 'h'
		},
		yaxis: {
			title: 'kW',
			gridcolor: '#ddd'
		},

		xaxis: {
			range: [start, end], // Specifies the start and end points of visible part of graph(unshaded region on slider);
			rangeslider: {
				thickness: 0.1
			},
			showgrid: true,
			gridcolor: '#ddd'
		},
		margin: {
			t: 10,
			b: 10
		}
	};

	// Assign all the parameters required to create the Plotly object (data, layout, config) to the variable props, returned by mapStateToProps
	// The Plotly toolbar is displayed if displayModeBar is set to true
	const props: IPlotlyChartProps = {
		data: datasets,
		layout,
		config: {
			displayModeBar: true,
			locales: Locales // makes locales available for use
		}
	};
	props.config.locale = state.admin.defaultLanguage;
	return props;
}

export default connect(mapStateToProps)(PlotlyChart);
