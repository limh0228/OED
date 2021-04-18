/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

ALTER TABLE maps
	ADD COLUMN IF NOT EXISTS north_angle FLOAT(8) DEFAULT 0.0,
	ADD COLUMN IF NOT EXISTS max_circle_size_fraction FLOAT(8) DEFAULT 0.15;
