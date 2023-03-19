import React from 'react';

type SelectorProps = {
	name: string;
	versions: string[];
};

export default function PHPSelector(props: SelectorProps) {
	return (
		<select
			id={props.name + '-version'}
			onChange={(event) => {
				console.log(window.location.toString());
				const url = new URL(window.location.toString());
				url.searchParams.set(props.name, event.target.value);
				console.log("FINAL URL: ",url);
				//window.location.assign(url);
			}}
		>
			{props.versions.map((value) => (
				<option
					selected={
						new URL(window.location.toString()).searchParams.get(
							props.name
						) === value
					}
					value={value}
				>
					{props.name.toString() + ' ' + value}
				</option>
			))}
		</select>
	);
}
