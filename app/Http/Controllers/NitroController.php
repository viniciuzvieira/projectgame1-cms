<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NitroController extends Controller
{
    public function __invoke(Request $request)
    {
        return view('client.nitro', [
            'sso' => $request->filled('sso') ? $request->get('sso') : '',
        ]);
    }
}