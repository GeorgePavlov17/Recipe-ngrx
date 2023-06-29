import { Actions, ofType, createEffect } from "@ngrx/effects";
import * as AuthActions from './auth.actions';
import { catchError, map, of, switchMap, tap } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { environment } from "src/environments/environment";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";

export interface AuthResponseData {
    kind: string;
    idToken: string;
    email: string;
    refreshToken: string;
    expiresIn: string;
    localId: string;
    registered?: boolean;
}

const handleAuthentication = (expiresIn: number, email: string, userId: string, token: string) => {
    const expirationDate = new Date(new Date().getTime() + expiresIn * 1000);
    return new AuthActions.AuthenticateSuccess({
        email: email,
        userId: userId,
        token: token,
        expirationDate: expirationDate
    });
}

const handleError = (errorRes: any) => {
    let errorMessage = 'An unknown error occurred!';
    if (!errorRes.error || !errorRes.error.error) {
      return of(new AuthActions.AuthenticateFail(errorMessage));
    }
    switch (errorRes.error.error.message) {
      case 'EMAIL_EXISTS':
        errorMessage = 'This email exists already';
        break;
      case 'EMAIL_NOT_FOUND':
        errorMessage = 'This email does not exist.';
        break;
      case 'INVALID_PASSWORD':
        errorMessage = 'This password is not correct.';
        break;
    }
    return of(new AuthActions.AuthenticateFail(errorMessage));
}

@Injectable()
export class AuthEffects {
    authSignup = createEffect(() => this.actions$.pipe(
        ofType(AuthActions.SIGNUP_START),
        switchMap((signupAction: AuthActions.SignupStart) => {
          return this.http.post<AuthResponseData>(
            'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyCUJdtEXIvVgfl4leR-oF82I3OE9vwoIMM',
            {
              email: signupAction.payload.email,
              password: signupAction.payload.password,
              returnSecureToken: true
            }
          ).pipe(
            map(resData => {
              return handleAuthentication(+resData.expiresIn, resData.email, resData.localId, resData.idToken)
            }),
            catchError(errorRes => {
              return handleError(errorRes);
            })
        );
        })
      ));

      authLogin = createEffect(() => this.actions$.pipe(
        ofType(AuthActions.LOGIN_START),
        switchMap((authData: AuthActions.LoginStart) => {
          return this.http
            .post<AuthResponseData>(
              'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCUJdtEXIvVgfl4leR-oF82I3OE9vwoIMM',
              {
                email: authData.payload.email,
                password: authData.payload.password,
                returnSecureToken: true
              }
            )
            .pipe(
              map(resData => {
                const expirationDate = new Date(new Date().getTime() + +resData.expiresIn * 1000);
                return new AuthActions.AuthenticateSuccess({
                  email: resData.email,
                  userId: resData.localId,
                  token: resData.idToken,
                  expirationDate: expirationDate
                });
              }),
              catchError(error => {
                // Handle error here
                return of(new AuthActions.AuthenticateFail(error));
              })
            );
        })
      ));

   
    authSuccess = createEffect(() => this.actions$.pipe(
        ofType(AuthActions.AUTHENTINCATE_SUCCESS),
        tap(() => {
            this.router.navigate(['/']);
        })
    ), { dispatch: false });

    constructor(private actions$: Actions, private http: HttpClient, private router: Router) {}
}